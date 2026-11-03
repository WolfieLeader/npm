import { $err, $fmtError, $ok } from "./error.js";
import type { Result } from "./error.js";
import { $isWellFormedStr } from "./validate.js";

export const textEncoder: TextEncoder = new TextEncoder();

/**
 * A new UTF-8 decoder that throws on invalid bytes and keeps a leading U+FEFF, so bytes round-trip.
 * Streaming decodes need their own instance: an aborted stream leaves state behind.
 */
export function $newStrictUtf8Decoder(): TextDecoder {
  return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
}

const strictUtf8Decoder = $newStrictUtf8Decoder();

export const ENCODING: readonly ["base64", "base64url", "hex", "utf8", "latin1"] = Object.freeze([
  "base64",
  "base64url",
  "hex",
  "utf8",
  "latin1",
] as const);
export const CIPHER_ENCODING: readonly ["base64", "base64url", "hex"] = Object.freeze([
  "base64",
  "base64url",
  "hex",
] as const);

export type Encoding = (typeof ENCODING)[number];
export type CipherEncoding = (typeof CIPHER_ENCODING)[number];

export function $convertStrToBytes(
  data: string,
  inputEncoding: Encoding = "utf8",
): Result<{ result: Uint8Array<ArrayBuffer> }> {
  if (typeof data !== "string") {
    return $err({
      message: "strToBytes: Data must be a string",
      description: `Expected a string value, received ${typeof data}`,
    });
  }
  if (!ENCODING.includes(inputEncoding)) {
    return $err({
      message: "strToBytes: Unsupported encoding",
      description: "Use base64, base64url, hex, utf8, or latin1",
    });
  }

  try {
    const bytes = strToBytes[inputEncoding](data);
    return $ok({ result: bytes });
  } catch (error) {
    return $err({ message: "strToBytes: Failed to convert data", description: $fmtError(error) });
  }
}

export function $convertBytesToStr(data: Uint8Array | ArrayBuffer, outputEncoding: Encoding = "utf8"): Result<string> {
  if (!(data instanceof ArrayBuffer || data instanceof Uint8Array)) {
    return $err({
      message: "bytesToStr: Data must be an ArrayBuffer or Uint8Array",
      description: `Expected binary data (ArrayBuffer or Uint8Array), received ${typeof data}`,
    });
  }
  if (!ENCODING.includes(outputEncoding)) {
    return $err({
      message: "bytesToStr: Unsupported encoding",
      description: "Use base64, base64url, hex, utf8, or latin1",
    });
  }
  try {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    const str = bytesToStr[outputEncoding](bytes);
    return $ok(str);
  } catch (error) {
    return $err({ message: "bytesToStr: Failed to convert data", description: $fmtError(error) });
  }
}

export const strToBytes: Readonly<Record<Encoding, (data: string) => Uint8Array<ArrayBuffer>>> = {
  base64: $fromBase64,
  base64url: $fromBase64Url,
  hex: $fromHex,
  latin1: $fromLatin1,
  utf8: $fromUtf8,
};

export const bytesToStr: Readonly<Record<Encoding, (data: Uint8Array) => string>> = {
  base64: $toBase64,
  base64url: $toBase64Url,
  hex: $toHex,
  latin1: $toLatin1,
  utf8: (data: Uint8Array): string => strictUtf8Decoder.decode(data),
};

/** Encodes a string as UTF-8. Throws on lone surrogates instead of silently replacing them with U+FFFD. */
export function $fromUtf8(data: string): Uint8Array<ArrayBuffer> {
  if (!$isWellFormedStr(data)) throw new Error("Invalid UTF-16 string (lone surrogate)");
  return textEncoder.encode(data);
}

export function $toLatin1(bytes: Uint8Array): string {
  let out = "";
  const chunk = 1 << 15;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCodePoint(...bytes.subarray(i, i + chunk));
  }
  return out;
}

export function $fromLatin1(data: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    // Any non-latin1 char, including a surrogate pair, yields a code point above 255.
    const charCode = data.codePointAt(i);
    if (charCode === undefined || charCode > 255) throw new Error("Invalid latin1 string");
    out[i] = charCode;
  }
  return out;
}

export function $toBase64(bytes: Uint8Array): string {
  return btoa($toLatin1(bytes));
}

const B64_STD = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const B64_URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** Table entry for the char at `index` of `str`, or 255 (invalid) when the char is not a single byte. */
function $lookupByte(table: Uint8Array, str: string, index: number): number {
  const code = str.codePointAt(index);
  if (code === undefined || code > 255) return 255;
  return table[code] ?? 255;
}

function $buildB64Table(alphabet: string): Uint8Array {
  const table = new Uint8Array(256).fill(255);
  for (let i = 0; i < alphabet.length; i++) {
    const code = alphabet.codePointAt(i);
    if (code !== undefined) table[code] = i;
  }
  return table;
}

const B64_STD_TABLE = $buildB64Table(B64_STD);
const B64_URL_TABLE = $buildB64Table(B64_URL);

interface B64Ctx {
  readonly data: string;
  readonly table: Uint8Array;
  readonly out: Uint8Array<ArrayBuffer>;
}

/** Length of `data` without padding, or -1 when the length or padding is invalid. */
function $b64DataLength(data: string, padding: "required" | "optional"): number {
  let pad = 0;
  if (data.endsWith("==")) pad = 2;
  else if (data.endsWith("=")) pad = 1;
  const len = data.length - pad;
  if (len % 4 === 1) return -1;
  // When padding is present (or required), it must complete the final 4-char block exactly.
  const mustAlign = pad > 0 || padding === "required";
  if (mustAlign && data.length % 4 !== 0) return -1;
  return len;
}

/** Decodes one block of 2-4 chars at `i`. Returns false on a bad char or non-zero unused trailing bits. */
function $decodeB64Block(ctx: B64Ctx, i: number, count: number): boolean {
  let acc = 0;
  for (let k = 0; k < 4; k++) {
    const value = k < count ? $lookupByte(ctx.table, ctx.data, i + k) : 0; // pad with sextet 0 ("A")
    if (value === 255) return false;
    acc = (acc << 6) | value;
  }
  const bytes = count - 1;
  // Canonical check: bits not covered by output bytes must be zero, so "AB==" is rejected and only "AA==" decodes to [0].
  if ((acc & ((1 << (24 - bytes * 8)) - 1)) !== 0) return false;
  const o = (i / 4) * 3;
  for (let k = 0; k < bytes; k++) ctx.out[o + k] = (acc >> (16 - 8 * k)) & 0xff;
  return true;
}

/**
 * Strict, linear-time base64 decoder. It uses no regex, so large input cannot overflow the regex stack.
 * Rejects non-alphabet chars, whitespace, wrong or misplaced padding, and non-canonical trailing bits.
 * Returns `null` on invalid input.
 */
function $decodeB64(data: string, table: Uint8Array, padding: "required" | "optional"): Uint8Array<ArrayBuffer> | null {
  if (typeof data !== "string") return null;
  const len = $b64DataLength(data, padding);
  if (len < 0) return null;
  const ctx: B64Ctx = { data, table, out: new Uint8Array(Math.floor((len * 3) / 4)) };
  for (let i = 0; i < len; i += 4) {
    if (!$decodeB64Block(ctx, i, Math.min(4, len - i))) return null;
  }
  return ctx.out;
}

/** Decodes standard base64. Padding is required; non-canonical input is rejected. */
export function $fromBase64(data: string): Uint8Array<ArrayBuffer> {
  const out = $decodeB64(data, B64_STD_TABLE, "required");
  if (!out) throw new Error("Invalid base64 string");
  return out;
}

export function $toBase64Url(bytes: Uint8Array): string {
  const padding = (3 - (bytes.length % 3)) % 3;
  const base64 = $toBase64(bytes);
  return base64
    .slice(0, base64.length - padding)
    .replaceAll("+", "-")
    .replaceAll("/", "_");
}

/** Decodes base64url. Padding is optional, but when present it must be exact; non-canonical input is rejected. */
export function $fromBase64Url(data: string): Uint8Array<ArrayBuffer> {
  const out = $decodeB64(data, B64_URL_TABLE, "optional");
  if (!out) throw new Error("Invalid base64url string");
  return out;
}

const HEX_TABLE = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));

const HEX_NIBBLE = new Uint8Array(256).fill(255);
for (let i = 48; i <= 57; i++) HEX_NIBBLE[i] = i - 48; // 0-9
for (let i = 65; i <= 70; i++) HEX_NIBBLE[i] = i - 55; // A-F
for (let i = 97; i <= 102; i++) HEX_NIBBLE[i] = i - 87; // a-f

export function $toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => HEX_TABLE[byte] ?? "").join("");
}

export function $fromHex(data: string): Uint8Array<ArrayBuffer> {
  const clean = data.startsWith("0x") || data.startsWith("0X") ? data.slice(2) : data;
  if (clean.length % 2 !== 0) throw new Error("Invalid hex string");

  const out = new Uint8Array(clean.length / 2);
  for (let i = 0, j = 0; i < clean.length; i += 2, j++) {
    const hi = $lookupByte(HEX_NIBBLE, clean, i);
    const lo = $lookupByte(HEX_NIBBLE, clean, i + 1);
    if (hi === 255 || lo === 255) throw new Error("Invalid hex string");
    out[j] = (hi << 4) | lo;
  }
  return out;
}
