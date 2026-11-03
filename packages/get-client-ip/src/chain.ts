import { $isTrusted, $parseNode } from "./ip.js";
import type { ParsedIp, Subnet } from "./ip.js";

/** A forwarding-chain node, left to right. `null` marks an unknown, obfuscated, or invalid node. */
export type ChainNode = ParsedIp | null;

/** Splits `X-Forwarded-For` into nodes. Empty list elements are ignored (RFC 9110 §5.6.1). */
export function $parseXForwardedFor(value: string): ChainNode[] {
  return value
    .split(",")
    .filter((token) => token.trim() !== "")
    .map($parseNode);
}

/** Splits on `separator` outside quoted strings. Returns `null` for an unterminated quote. */
function $splitOutsideQuotes(value: string, separator: string): string[] | null {
  const parts: string[] = [];
  let start = 0;
  let inQuotes = false;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (inQuotes && ch === "\\") {
      i++;
    } else if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes && ch === separator) {
      parts.push(value.slice(start, i));
      start = i + 1;
    }
  }
  if (inQuotes) return null;
  parts.push(value.slice(start));
  return parts;
}

// RFC 7239 §4: forwarded-pair = token "=" value. No whitespace around "=".
const PAIR = /^([!#$%&'*+\-.^_`|~0-9A-Za-z]+)=(.*)$/s;
// Token, plus `:` `[` `]` so unquoted `for=1.2.3.4:80` still parses.
const UNQUOTED_VALUE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z:[\]]+$/;

function $parseValue(raw: string): string | null {
  if (UNQUOTED_VALUE.test(raw)) return raw;
  if (raw.length < 2 || !raw.startsWith('"') || !raw.endsWith('"')) return null;
  return raw.slice(1, -1).replaceAll(/\\(.)/gs, "$1");
}

function $parseForNode(value: string): ChainNode {
  const lower = value.trim().toLowerCase();
  if (lower === "unknown" || lower.startsWith("_")) return null;
  return $parseNode(value);
}

/** Parses `key=value`. Returns `null` on bad syntax. */
function $parsePair(pair: string): { key: string; value: string } | null {
  const [, key, rawValue] = PAIR.exec(pair.trim()) ?? [];
  const value = rawValue === undefined ? null : $parseValue(rawValue);
  if (key === undefined || value === null) return null;
  return { key: key.toLowerCase(), value };
}

/** Parses one `Forwarded` element. Returns `undefined` for an empty element. */
function $parseElement(element: string): ChainNode | undefined {
  if (!element.trim()) return undefined;
  // Only a malformed, client-sent element can leave a quote open; it parses as invalid.
  const pairs = $splitOutsideQuotes(element, ";");
  if (!pairs) return null;
  const parsed = pairs.filter((pair) => pair.trim() !== "").map($parsePair);
  if (parsed.some((pair) => pair === null)) return null;

  const forValues = parsed.filter((pair) => pair?.key === "for");
  // RFC 7239 §4: a parameter must not occur more than once per element.
  if (forValues.length !== 1 || !forValues[0]) return null;
  return $parseForNode(forValues[0].value);
}

/** True when the character at `index` follows an odd run of backslashes, so a quote there is escaped. */
function $isEscaped(value: string, index: number): boolean {
  let backslashes = 0;
  while (value[index - 1 - backslashes] === "\\") backslashes++;
  return backslashes % 2 === 1;
}

/**
 * Splits `Forwarded` into elements on commas outside quoted strings, scanning from the right.
 * Proxies append well-formed elements on the right and the client controls only the left part,
 * so nothing a client sends can change how the proxy-appended elements split.
 */
function $splitElementsFromRight(value: string): string[] {
  const elements: string[] = [];
  let end = value.length;
  let inQuotes = false;
  for (let i = value.length - 1; i >= 0; i--) {
    if (value[i] === '"' && !$isEscaped(value, i)) {
      inQuotes = !inQuotes;
    } else if (value[i] === "," && !inQuotes) {
      elements.push(value.slice(i + 1, end));
      end = i;
    }
  }
  elements.push(value.slice(0, end));
  return elements.toReversed();
}

/**
 * Parses RFC 7239 `Forwarded` into each element's `for` node.
 * An element without `for`, with `for=unknown`, an obfuscated identifier (`_hidden`), or bad syntax becomes `null`.
 */
export function $parseForwarded(value: string): ChainNode[] {
  return $splitElementsFromRight(value)
    .map($parseElement)
    .filter((node) => node !== undefined);
}

/**
 * Walks the chain from the right, starting at the trusted socket peer.
 * Each trusted hop vouches for the node to its left. Stops at the first untrusted node and returns it first.
 * An unknown or invalid node stops the walk; the nearest trusted hop is then the best known client.
 * Returns the client followed by the trusted hops toward the server.
 */
export function $pickFromRight(
  nodes: readonly ChainNode[],
  peer: ParsedIp,
  subnets: readonly Subnet[],
): [string, ...string[]] {
  const path: string[] = [peer.text];
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    if (!node) break;
    path.push(node.text);
    if (!$isTrusted(node, subnets)) break;
  }
  const [client = peer.text, ...towardServer] = path.toReversed();
  return [client, ...towardServer];
}
