import { $err, $fmtError, $ok, type Result } from "./error.js";
import { $isStr } from "./validate.js";

export const textEncoder = new TextEncoder();
export const textDecoder = new TextDecoder();

export const ENCODING = Object.freeze(["base64", "base64url", "hex", "utf8", "latin1"] as const);
export const CIPHER_ENCODING = Object.freeze(["base64", "base64url", "hex"] as const);

export type Encoding = (typeof ENCODING)[number];
export type CipherEncoding = (typeof CIPHER_ENCODING)[number];

export function $convertStrToBytes(
  data: string,
  inputEncoding: Encoding = "utf8",
): Result<{ result: Uint8Array<ArrayBuffer> }> {
  if (!$isStr(data)) {
    return $err({
      msg: "String to Bytes: Empty data",
      desc: "Data must be a non-empty string",
    });
  }
  if (!ENCODING.includes(inputEncoding)) {
    return $err({
      msg: `String to Bytes: Unsupported encoding: ${inputEncoding}`,
      desc: "Use base64, base64url, hex, utf8, or latin1",
    });
  }

  try {
    const bytes = strToBytes[inputEncoding](data);
    return $ok({ result: bytes });
  } catch (error) {
    return $err({ msg: "String to Bytes: Failed to convert data", desc: $fmtError(error) });
  }
}

export function $convertBytesToStr(data: Uint8Array | ArrayBuffer, outputEncoding: Encoding = "utf8"): Result<string> {
  if (!(data instanceof ArrayBuffer || data instanceof Uint8Array)) {
    return $err({
      msg: "Bytes to String: Invalid data type",
      desc: "Data must be an ArrayBuffer or Uint8Array",
    });
  }
  if (!ENCODING.includes(outputEncoding)) {
    return $err({
      msg: `Bytes to String: Unsupported encoding: ${outputEncoding}`,
      desc: "Use base64, base64url, hex, utf8, or latin1",
    });
  }
  try {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    const str = bytesToStr[outputEncoding](bytes);
    return $ok(str);
  } catch (error) {
    return $err({ msg: "Bytes to String: Failed to convert data", desc: $fmtError(error) });
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
  utf8: (data: Uint8Array) => textDecoder.decode(data),
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

export function $toHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += (bytes[i] as number).toString(16).padStart(2, "0");
  }
  return out;
}

export function $fromHex(data: string): Uint8Array<ArrayBuffer> {
  const clean = data.startsWith("0x") ? data.slice(2) : data;
  if (clean.length % 2 !== 0) throw new Error("Invalid hex string");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) throw new Error("Invalid hex string");
    out[i] = byte;
  }
  return out;
}
