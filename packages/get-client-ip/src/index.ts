import type { IncomingHttpHeaders } from "node:http";
import { $parseForwarded, $parseXForwardedFor, $pickFromRight } from "./chain.js";
import { $isTrusted, $parseIp, $parseNode, $parseSubnet } from "./ip.js";
import type { ParsedIp, Subnet } from "./ip.js";

type NonEmptyArray<T> = [T, ...T[]];

/** Minimal request interface — Express v4/v5, Fastify, NestJS, or a raw `node:http` `IncomingMessage`. */
export interface IpRequest {
  /** Address resolved by the framework (Express `trust proxy`, Fastify `trustProxy`). Used when valid. */
  ip?: string | undefined;
  headers: IncomingHttpHeaders;
  socket?: { remoteAddress?: string | undefined } | undefined;
  clientIp?: string | undefined;
  clientIps?: NonEmptyArray<string> | undefined;
}

/** Options for {@link getClientIp} and {@link getClientIpMiddleware}. */
export interface GetClientIpOptions {
  /**
   * Proxy addresses whose forwarding headers you trust, as IPs or CIDR ranges (`"10.0.0.0/8"`, `"2001:db8::/32"`).
   * Defaults to {@link DEFAULT_TRUSTED_PROXIES} (loopback, private, link-local, unique-local).
   * Pass `[]` to trust no proxy: forwarding headers are ignored, and the result is `req.ip` when set, else the socket address.
   */
  trustedProxies?: readonly string[];
  /**
   * The header your trusted proxies append to. Defaults to `"x-forwarded-for"`.
   * Use `"forwarded"` only when your proxies write RFC 7239 `Forwarded`. The other header is ignored.
   */
  forwardedHeader?: "x-forwarded-for" | "forwarded";
  /**
   * Single-IP headers that your edge always overwrites, checked in order (e.g. `["cf-connecting-ip"]`).
   * Read only when the socket peer is a trusted proxy. Defaults to `[]` (none).
   */
  trustedHeaders?: readonly string[];
}

/**
 * Express-style middleware signature.
 * `next` is called with no arguments, so it accepts any framework's `next` function.
 */
export type ClientIpMiddleware = (req: IpRequest, res: unknown, next: (...args: never[]) => void) => void;

/** Ranges trusted as proxies by default: loopback, RFC 1918 private, link-local, IPv6 loopback, ULA, and link-local. CGNAT (`100.64.0.0/10`) is not included. */
export const DEFAULT_TRUSTED_PROXIES: readonly string[] = Object.freeze([
  "127.0.0.0/8",
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
  "169.254.0.0/16",
  "::1/128",
  "fc00::/7",
  "fe80::/10",
]);

interface ResolvedOptions {
  subnets: readonly Subnet[];
  forwardedHeader: "x-forwarded-for" | "forwarded";
  trustedHeaders: readonly string[];
}

const DEFAULT_SUBNETS: readonly Subnet[] = DEFAULT_TRUSTED_PROXIES.map($parseSubnet);
const DEFAULT_OPTIONS: ResolvedOptions = {
  subnets: DEFAULT_SUBNETS,
  forwardedHeader: "x-forwarded-for",
  trustedHeaders: [],
};
/** Options as received at runtime: JavaScript callers can pass values of any type. */
interface UncheckedOptions {
  trustedProxies?: unknown;
  forwardedHeader?: unknown;
  trustedHeaders?: unknown;
}

function $resolveSubnets(trustedProxies: unknown): readonly Subnet[] {
  if (trustedProxies === undefined) return DEFAULT_SUBNETS;
  if (!Array.isArray(trustedProxies)) throw new TypeError("trustedProxies must be an array");
  return trustedProxies.map($parseSubnet);
}

function $isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function $resolveOptions(input: unknown): ResolvedOptions {
  if (input === undefined || input === null) return DEFAULT_OPTIONS;
  if (typeof input !== "object") throw new TypeError("options must be an object");
  const options: UncheckedOptions = input;

  const forwardedHeader = options.forwardedHeader ?? "x-forwarded-for";
  if (forwardedHeader !== "x-forwarded-for" && forwardedHeader !== "forwarded") {
    throw new TypeError(`forwardedHeader must be "x-forwarded-for" or "forwarded"`);
  }

  const trustedHeaders = options.trustedHeaders ?? [];
  if (!$isStringArray(trustedHeaders)) {
    throw new TypeError("trustedHeaders must be an array of header names");
  }

  return {
    subnets: $resolveSubnets(options.trustedProxies),
    forwardedHeader,
    trustedHeaders: trustedHeaders.map((h) => h.toLowerCase()),
  };
}

function $headerValue(headers: IncomingHttpHeaders | undefined, name: string): string | undefined {
  const value = headers?.[name];
  if (Array.isArray(value)) return value.join(",");
  return typeof value === "string" ? value : undefined;
}

function $fromTrustedHeaders(req: IpRequest, names: readonly string[]): ParsedIp | null {
  for (const name of names) {
    const value = $headerValue(req.headers, name);
    const ip = value === undefined ? null : $parseNode(value);
    if (ip) return ip;
  }
  return null;
}

function $walkChain(req: IpRequest, peer: ParsedIp, options: ResolvedOptions): NonEmptyArray<string> {
  const header = $headerValue(req.headers, options.forwardedHeader) ?? "";
  const nodes = options.forwardedHeader === "forwarded" ? $parseForwarded(header) : $parseXForwardedFor(header);
  return $pickFromRight(nodes, peer, options.subnets);
}

/** Returns the walked chain when it reached an untrusted hop, else `[fallback]`. */
function $preferUntrusted(
  path: NonEmptyArray<string>,
  fallback: ParsedIp,
  subnets: readonly Subnet[],
): NonEmptyArray<string> {
  const client = $parseIp(path[0]);
  return client && !$isTrusted(client, subnets) ? path : [fallback.text];
}

/**
 * A `req.ip` inside trustedProxies (e.g. Express without `trust proxy`) is the proxy, not the client.
 * Walk the chain from the trusted socket peer instead, and keep `req.ip` when no untrusted hop is found.
 */
function $fromFrameworkIp(
  req: IpRequest,
  ip: ParsedIp,
  { options, trustedPeer }: { options: ResolvedOptions; trustedPeer: ParsedIp | null },
): NonEmptyArray<string> {
  if (!trustedPeer || !$isTrusted(ip, options.subnets)) return [ip.text];
  return $preferUntrusted($walkChain(req, trustedPeer, options), ip, options.subnets);
}

/** Returns the client IP followed by the trusted hops toward the server, or `undefined`. */
function $resolve(req: IpRequest, options: ResolvedOptions): NonEmptyArray<string> | undefined {
  const peer = $parseIp(req.socket?.remoteAddress);
  const trustedPeer = peer && $isTrusted(peer, options.subnets) ? peer : null;

  const fromHeader = trustedPeer ? $fromTrustedHeaders(req, options.trustedHeaders) : null;
  if (fromHeader && trustedPeer) return [fromHeader.text, trustedPeer.text];

  const frameworkIp = $parseIp(req.ip);
  if (frameworkIp) return $fromFrameworkIp(req, frameworkIp, { options, trustedPeer });

  if (!peer) return undefined;
  return trustedPeer ? $walkChain(req, trustedPeer, options) : [peer.text];
}

function $apply(req: IpRequest, options: ResolvedOptions): string | undefined {
  const ips = $resolve(req, options);
  req.clientIp = ips?.[0];
  req.clientIps = ips;
  return ips?.[0];
}

function $looksLikeOptions(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  return "trustedProxies" in value || "forwardedHeader" in value || "trustedHeaders" in value;
}

/**
 * Returns the client IP of an incoming request, or `undefined` when no address is known.
 *
 * Resolution order:
 * 1. A header from `options.trustedHeaders` (opt-in, e.g. `cf-connecting-ip`), only when the socket peer is a trusted proxy.
 * 2. `req.ip` when it is a valid IP outside `trustedProxies` (Express `trust proxy`, Fastify `trustProxy`).
 *    A `req.ip` inside `trustedProxies` (e.g. Express without `trust proxy` behind nginx) is the proxy, not the client:
 *    the chain is walked as in step 4, and `req.ip` is kept only when no untrusted hop is found.
 * 3. The socket address, when the peer is not a trusted proxy.
 * 4. Otherwise, walk `X-Forwarded-For` (or `Forwarded`) from the right, skipping trusted proxies,
 *    and return the first untrusted address. If every hop is trusted, return the leftmost one.
 *    An `unknown`, obfuscated, or invalid hop stops the walk; the nearest trusted hop is returned.
 *
 * Client-supplied entries to the left of the first untrusted hop are never returned.
 * Vendor headers (`cf-connecting-ip`, `true-client-ip`, …) are ignored unless listed in `trustedHeaders`.
 * Results are normalized: IPv4-mapped IPv6 becomes IPv4, IPv6 is lowercase and compressed, zone IDs are removed.
 *
 * Also sets `req.clientIp` and `req.clientIps` (client first, then the trusted hops toward this server).
 *
 * Works as Express middleware with default options (`app.use(getClientIp)`).
 * For custom options as middleware, use {@link getClientIpMiddleware}.
 *
 * @throws `Error` if `req` is missing. `TypeError` if `options` are invalid.
 *
 * @example
 * // raw node:http behind nginx on the same host
 * http.createServer((req, res) => res.end(getClientIp(req)));
 *
 * @example
 * // Behind Cloudflare and a private load balancer
 * const ip = getClientIp(req, { trustedHeaders: ["cf-connecting-ip"] });
 */
export function getClientIp(req: IpRequest, options?: GetClientIpOptions): string | undefined;
/** Express middleware form: populates `req.clientIp` and `req.clientIps` with default options, then calls `next()`. */
export function getClientIp(req: IpRequest, res: unknown, next: Parameters<ClientIpMiddleware>[2]): void;
export function getClientIp(
  req: IpRequest | null | undefined,
  optionsOrRes?: unknown,
  next?: Parameters<ClientIpMiddleware>[2],
): string | undefined {
  if (!req) throw new Error("Request is undefined");

  if (typeof next === "function") {
    if ($looksLikeOptions(optionsOrRes)) {
      throw new TypeError("getClientIp(req, options, next) ignores options; use getClientIpMiddleware(options)");
    }
    $apply(req, DEFAULT_OPTIONS);
    next();
    return undefined;
  }

  return $apply(req, $resolveOptions(optionsOrRes));
}

/**
 * Creates Express-style middleware that populates `req.clientIp` and `req.clientIps`, then calls `next()`.
 * Options are validated once, at creation.
 *
 * @example
 * app.use(getClientIpMiddleware({ trustedProxies: [...DEFAULT_TRUSTED_PROXIES, "203.0.113.0/24"] }));
 */
export function getClientIpMiddleware(options?: GetClientIpOptions): ClientIpMiddleware {
  const resolved = $resolveOptions(options);
  return (req: IpRequest | null | undefined, _res, next) => {
    if (!req) throw new Error("Request is undefined");
    $apply(req, resolved);
    next();
  };
}

declare global {
  namespace Express {
    export interface Request {
      /** The client IP resolved by `get-client-ip`. */
      clientIp?: string | undefined;
      /** The client IP followed by the trusted hops toward this server. */
      clientIps?: NonEmptyArray<string> | undefined;
    }
  }
}
