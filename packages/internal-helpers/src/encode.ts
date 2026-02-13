import { $err, $fmtError, $ok, type Result } from "./error.js";

export const textEncoder = new TextEncoder();
export const textDecoder = new TextDecoder();
const strictUtf8Decoder = new TextDecoder("utf-8", { fatal: true });

export const ENCODING = Object.freeze(["base64", "base64url", "hex", "utf8", "latin1"] as const);
export const CIPHER_ENCODING = Object.freeze(["base64", "base64url", "hex"] as const);

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
      message: `strToBytes: Unsupported encoding: ${inputEncoding}`,
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
      message: `bytesToStr: Unsupported encoding: ${outputEncoding}`,
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

export const strToBytes = {
  base64: $fromBase64,
  base64url: $fromBase64Url,
  hex: $fromHex,
  latin1: $fromLatin1,
  utf8: (data: string) => textEncoder.encode(data),
} as const satisfies Record<Encoding, (data: string) => Uint8Array<ArrayBuffer>>;

export const bytesToStr = {
  base64: $toBase64,
  base64url: $toBase64Url,
  hex: $toHex,
  latin1: $toLatin1,
  utf8: (data: Uint8Array) => strictUtf8Decoder.decode(data),
} as const satisfies Record<Encoding, (data: Uint8Array) => string>;

export function $toLatin1(bytes: Uint8Array): string {
  let out = "";
  const chunk = 1 << 15;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return out;
}

export function $fromLatin1(data: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const charCode = data.charCodeAt(i);
    if (charCode > 255) throw new Error("Invalid latin1 string");
    out[i] = charCode;
  }
  return out;
}

export function $toBase64(bytes: Uint8Array): string {
  return btoa($toLatin1(bytes));
}

export function $fromBase64(data: string): Uint8Array<ArrayBuffer> {
  return $fromLatin1(atob(data));
}

export function $toBase64Url(bytes: Uint8Array): string {
  return $toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function $fromBase64Url(data: string): Uint8Array<ArrayBuffer> {
  let base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (base64.length % 4)) % 4;
  base64 += "=".repeat(padLen);
  return $fromBase64(base64);
}

const HEX_TABLE = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));

const HEX_NIBBLE = new Uint8Array(256).fill(255);
for (let i = 48; i <= 57; i++) HEX_NIBBLE[i] = i - 48; // 0-9
for (let i = 65; i <= 70; i++) HEX_NIBBLE[i] = i - 55; // A-F
for (let i = 97; i <= 102; i++) HEX_NIBBLE[i] = i - 87; // a-f

export function $toHex(bytes: Uint8Array): string {
  const hex = new Array<string>(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    hex[i] = HEX_TABLE[bytes[i] as number] as string;
  }
  return hex.join("");
}

export function $fromHex(data: string): Uint8Array<ArrayBuffer> {
  const clean = data.startsWith("0x") || data.startsWith("0X") ? data.slice(2) : data;
  if (clean.length % 2 !== 0) throw new Error("Invalid hex string");

  const out = new Uint8Array(clean.length / 2);
  for (let i = 0, j = 0; i < clean.length; i += 2, j++) {
    const hiCode = clean.charCodeAt(i);
    const loCode = clean.charCodeAt(i + 1);
    if (hiCode > 255 || loCode > 255) throw new Error("Invalid hex string");
    const hi = HEX_NIBBLE[hiCode] as number;
    const lo = HEX_NIBBLE[loCode] as number;
    if (hi === 255 || lo === 255) throw new Error("Invalid hex string");
    out[j] = (hi << 4) | lo;
  }
  return out;
}
