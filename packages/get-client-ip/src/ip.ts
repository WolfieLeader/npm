import { isIP } from "node:net";

/** A parsed address. IPv4-mapped IPv6 is stored as IPv4. */
export interface ParsedIp {
  version: 4 | 6;
  bytes: Uint8Array;
  /** Canonical text: dotted IPv4, or lowercase compressed IPv6 (RFC 5952). */
  text: string;
}

/** A CIDR range. */
export interface Subnet {
  version: 4 | 6;
  bytes: Uint8Array;
  prefix: number;
}

function $stripZoneId(ip: string): string {
  const idx = ip.indexOf("%");
  return idx === -1 ? ip : ip.slice(0, idx);
}

/** Expands a canonical IPv6 string (hex groups only, at most one `::`) into 16 bytes. */
function $expandIpv6(canonical: string): Uint8Array | null {
  const halves = canonical.split("::");
  const [headText = "", tailText = ""] = halves;
  const head = headText === "" ? [] : headText.split(":");
  const tail = tailText === "" ? [] : tailText.split(":");
  const missing = 8 - head.length - tail.length;
  if (halves.length > 2 || missing < 0) return null;

  const groups = [...head, ...Array<string>(missing).fill("0"), ...tail];
  const bytes = new Uint8Array(16);
  for (const [i, group] of groups.entries()) {
    const value = Number.parseInt(group, 16);
    if (Number.isNaN(value)) return null;
    bytes[i * 2] = value >> 8;
    bytes[i * 2 + 1] = value & 0xff;
  }
  return bytes;
}

function $isIpv4Mapped(bytes: Uint8Array): boolean {
  return bytes.subarray(0, 10).every((b) => b === 0) && bytes[10] === 0xff && bytes[11] === 0xff;
}

function $parseIpv6(ip: string): ParsedIp | null {
  let canonical: string;
  try {
    // WHATWG URL serializes IPv6 hosts in RFC 5952 form and turns embedded IPv4 into hex groups.
    canonical = new URL(`http://[${ip}]/`).hostname.slice(1, -1);
  } catch {
    return null;
  }

  const bytes = $expandIpv6(canonical);
  if (!bytes) return null;
  if ($isIpv4Mapped(bytes)) {
    const v4 = bytes.slice(12);
    return { version: 4, bytes: v4, text: v4.join(".") };
  }
  return { version: 6, bytes, text: canonical };
}

/** Parses a bare IP (zone ID allowed). Returns `null` for anything else. */
export function $parseIp(input: unknown): ParsedIp | null {
  if (typeof input !== "string") return null;
  const ip = $stripZoneId(input);
  const version = isIP(ip);
  if (version === 4) return { version: 4, bytes: Uint8Array.from(ip.split(".").map(Number)), text: ip };
  if (version === 6) return $parseIpv6(ip);
  return null;
}

const BRACKETED = /^\[([^\]]+)\](?::[^:]*)?$/;
const IPV4_WITH_PORT = /^([^:]+):[^:]*$/;

/** Strips brackets and port from a node. Returns `null` for brackets around a non-IPv6 value. */
function $nodeAddress(node: string): string | null {
  const bracketed = BRACKETED.exec(node)?.[1];
  if (bracketed !== undefined) return bracketed.includes(":") ? bracketed : null;
  return IPV4_WITH_PORT.exec(node)?.[1] ?? node;
}

/** Parses a forwarding-chain node: bare IP, `IPv4:port`, or `[IPv6]` with optional `:port`. Rejects the unspecified address. */
export function $parseNode(raw: string): ParsedIp | null {
  const address = $nodeAddress(raw.trim());
  const ip = address === null ? null : $parseIp(address);
  if (!ip || ip.bytes.every((b) => b === 0)) return null;
  return ip;
}

function $parsePrefix(text: string | undefined, maxPrefix: number, entry: string): number {
  if (text === undefined) return maxPrefix;
  const prefix = /^\d{1,3}$/.test(text) ? Number(text) : Number.NaN;
  if (!(prefix <= maxPrefix)) throw new TypeError(`Invalid trusted proxy prefix: ${entry}`);
  return prefix;
}

/** Parses an IP or CIDR (`"10.0.0.0/8"`, `"::1"`, `"::ffff:10.0.0.0/104"`). Throws `TypeError` when invalid. */
export function $parseSubnet(entry: string): Subnet {
  if (typeof entry !== "string") throw new TypeError("trustedProxies entries must be strings");
  const [address = "", prefixText, extra] = entry.trim().split("/");
  const ip = $parseIp(address);
  if (!ip || extra !== undefined) throw new TypeError(`Invalid trusted proxy address: ${entry}`);

  const mapped = ip.version === 4 && isIP($stripZoneId(address)) === 6;
  if (!mapped) {
    const maxPrefix = ip.version === 4 ? 32 : 128;
    return { version: ip.version, bytes: ip.bytes, prefix: $parsePrefix(prefixText, maxPrefix, entry) };
  }

  const prefix = $parsePrefix(prefixText, 128, entry);
  if (prefix < 96) throw new TypeError(`IPv4-mapped prefix must be >= 96: ${entry}`);
  return { version: 4, bytes: ip.bytes, prefix: prefix - 96 };
}

function $inSubnet(ip: ParsedIp, subnet: Subnet): boolean {
  if (ip.version !== subnet.version) return false;
  const fullBytes = subnet.prefix >> 3;
  for (let i = 0; i < fullBytes; i++) {
    if (ip.bytes[i] !== subnet.bytes[i]) return false;
  }
  const remainingBits = subnet.prefix & 7;
  if (remainingBits === 0) return true;
  const mask = (0xff << (8 - remainingBits)) & 0xff;
  return ((ip.bytes[fullBytes] ?? 0) & mask) === ((subnet.bytes[fullBytes] ?? 0) & mask);
}

/** Reports whether `ip` falls inside any of `subnets`. */
export function $isTrusted(ip: ParsedIp, subnets: readonly Subnet[]): boolean {
  return subnets.some((subnet) => $inSubnet(ip, subnet));
}
