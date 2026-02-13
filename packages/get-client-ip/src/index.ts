import { isIP } from "node:net";
import type { NextFunction, Request, Response } from "express";

type NonEmptyArray<T> = [T, ...T[]];

function $isIP(ip: unknown): ip is string {
  return typeof ip === "string" && isIP(ip) !== 0;
}

function $isTrustedProxyAddress(ip: string): boolean {
  const ipVersion = isIP(ip);

  if (ipVersion === 4) {
    const [a, b] = ip.split(".").map((part) => Number.parseInt(part, 10));
    const secondOctet = b ?? -1;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && secondOctet === 254) return true;
    if (a === 192 && secondOctet === 168) return true;
    if (a === 172 && secondOctet >= 16 && secondOctet <= 31) return true;
    return false;
  }

  if (ipVersion === 6) {
    const lower = ip.toLowerCase();
    return (
      lower === "::1" ||
      (Number.parseInt(lower.slice(0, 4), 16) & 0xffc0) === 0xfe80 ||
      lower.startsWith("fc") ||
      lower.startsWith("fd") ||
      lower.startsWith("::ffff:10.") ||
      lower.startsWith("::ffff:127.") ||
      lower.startsWith("::ffff:169.254.") ||
      lower.startsWith("::ffff:192.168.") ||
      /^::ffff:172\.(1[6-9]|2\d|3[0-1])\./.test(lower)
    );
  }

  return false;
}

function $stripZoneId(ip: string): string {
  const idx = ip.indexOf("%");
  return idx === -1 ? ip : ip.slice(0, idx);
}

function $normalizeIpCandidate(candidate: string): string | null {
  const trimmed = candidate.trim();
  if (!trimmed) return null;

  const unquoted = trimmed.replace(/^"(.*)"$/, "$1");

  const bracketed = unquoted.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketed?.[1]) {
    const ip = $stripZoneId(bracketed[1]);
    if (isIP(ip) !== 0) return ip;
  }

  const stripped = $stripZoneId(unquoted);
  if (isIP(stripped) !== 0) return stripped;

  const ipv4WithPort = unquoted.match(/^([^:]+):(\d+)$/);
  if (ipv4WithPort?.[1] && isIP(ipv4WithPort[1]) === 4) return ipv4WithPort[1];

  return null;
}

// e.g. Forwarded: for=192.0.2.43;proto=http, for="[2001:db8:cafe::17]"
function $extractForwarded(value: string | string[]): NonEmptyArray<string> | null {
  const lines = Array.isArray(value) ? value : [value];
  const ips: string[] = [];

  for (const line of lines) {
    for (const segment of line.split(",")) {
      for (const directive of segment.split(";")) {
        const [rawKey, rawVal] = directive.split("=", 2);
        if (!rawKey || !rawVal) continue;
        if (rawKey.trim().toLowerCase() !== "for") continue;
        const ip = $normalizeIpCandidate(rawVal);
        if (ip) ips.push(ip);
      }
    }
  }

  return ips.length > 0 ? (ips as NonEmptyArray<string>) : null;
}

function $extractHeaderIps(headerValue: string | string[]): NonEmptyArray<string> | null {
  const values = Array.isArray(headerValue) ? headerValue : [headerValue];
  const ips: string[] = [];

  for (const value of values) {
    for (const token of value.split(",")) {
      const ip = $normalizeIpCandidate(token);
      if (ip) ips.push(ip);
    }
  }

  return ips.length > 0 ? (ips as NonEmptyArray<string>) : null;
}

// CDN-injected headers first (high trust — overwritten by the CDN on every request),
// then generic forwarding headers (lower trust — forwarded as-is from the client).
const LOOKUP_HEADERS = [
  "cf-connecting-ip",
  "true-client-ip",
  "fastly-client-ip",
  "x-appengine-user-ip",
  "cf-pseudo-ipv4",
  "x-client-ip",
  "x-forwarded-for",
  "forwarded-for",
  "x-forwarded",
  "x-real-ip",
  "x-cluster-client-ip",
];

function $extractIpFromHeaders(req: Request): NonEmptyArray<string> | null {
  if ($isIP(req.ip)) return [req.ip];

  if (!req.headers) return null;

  const remoteAddress = req.socket?.remoteAddress;
  if (!$isIP(remoteAddress) || !$isTrustedProxyAddress(remoteAddress)) {
    return null;
  }

  if (typeof req.headers.forwarded === "string" || Array.isArray(req.headers.forwarded)) {
    const forwardedIps = $extractForwarded(req.headers.forwarded);
    if (forwardedIps) return forwardedIps;
  }

  for (const header of LOOKUP_HEADERS) {
    const ip = req.headers[header];
    if (!ip || !(typeof ip === "string" || Array.isArray(ip))) continue;

    const extractedIps = $extractHeaderIps(ip);
    if (extractedIps) return extractedIps;
  }

  return null;
}

// biome-ignore-start lint/correctness/noUnusedFunctionParameters: Needed for Express middleware signature

/**
 * Extracts the client's IP address from an incoming Express request.
 *
 * This function works both as a standalone utility and as Express middleware.
 * It attempts to detect the IP by inspecting common proxy-related headers
 * such as `forwarded` (RFC 7239), `x-forwarded-for`, `x-real-ip`, and others. If no valid IP is found
 * in the headers, it falls back to `req.socket.remoteAddress`.
 * Header fallback is skipped when `req.socket.remoteAddress` is a public address,
 * reducing spoofing risk for direct internet-facing connections.
 *
 * When used as middleware, it populates:
 * - `req.clientIp`: The first valid IP address found.
 * - `req.clientIps`: A non-empty array of all valid IPs found.
 *
 * **Security note — trust boundary:** This function checks `req.ip` first (which
 * respects Express's `trust proxy` setting). When `req.ip` is falsy, it
 * reads forwarding headers **only** if the socket peer (`req.socket.remoteAddress`)
 * is a recognized private/proxy address. When the socket identity is absent or
 * public, headers are **not** trusted and the function falls back to
 * `req.socket.remoteAddress` directly. In production behind a reverse proxy,
 * configure Express's `trust proxy` so `req.ip` is populated correctly and
 * treated as the primary source of truth.
 *
 * @param req - The Express request object.
 * @param res - (Optional) The Express response object. Included to support middleware signature.
 * @param next - (Optional) The next function in the Express middleware chain.
 *
 * @returns The first detected client IP address as a string, or `undefined` if none is found.
 *
 * @throws Will throw an error if the `req` argument is not defined.
 *
 * @example
 * // Standalone usage:
 * app.get('/standalone-ip', (req, res) => {
 *   const ip = getClientIp(req);
 *   res.status(200).json({ ip });
 * });
 *
 * @example
 * // Middleware usage:
 * app.use(getClientIp);
 * app.get('/middleware-ip', (req, res) => {
 *   res.status(200).json({ ip: req.clientIp, ips: req.clientIps });
 * });
 */
export function getClientIp(req: Request, res?: Response, next?: NextFunction): string | undefined {
  if (!req) throw new Error("Request is undefined");

  const ips = $extractIpFromHeaders(req);
  if (ips) {
    req.clientIp = ips[0];
    req.clientIps = ips;
    next?.();
    return ips[0];
  }

  const remoteAddress = req.socket?.remoteAddress;
  if ($isIP(remoteAddress)) {
    req.clientIp = remoteAddress;
    req.clientIps = [remoteAddress];
    next?.();
    return remoteAddress;
  }

  next?.();
}

// biome-ignore-end lint/correctness/noUnusedFunctionParameters: Needed for Express middleware signature

declare global {
  namespace Express {
    export interface Request {
      /** The first IP address extracted from the request. */
      clientIp?: string;
      /** All IP addresses extracted from the request. */
      clientIps?: NonEmptyArray<string>;
    }
  }
}
