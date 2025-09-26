import { ENCODING } from '~/helpers/consts';
import { $err, $fmtError, $ok, type Result } from '~/helpers/error';
import type { Encoding } from '~/helpers/types';
import { $isStr } from '~/helpers/validate';

export const textEncoder = new TextEncoder();
export const textDecoder = new TextDecoder();

export function $convertStrToBytes(
  data: string,
  inputEncoding: Encoding = 'utf8',
): Result<{ result: Uint8Array<ArrayBuffer> }> {
  if (!$isStr(data)) {
    return $err({
      msg: 'Crypto Web API - String to Bytes: Empty data',
      desc: 'Data must be a non-empty string',
    });
  }
  if (!ENCODING.includes(inputEncoding)) {
    return $err({
      msg: `Crypto Web API - String to Bytes: Unsupported encoding: ${inputEncoding}`,
      desc: 'Use base64, base64url, hex, utf8, or latin1',
    });
  }

  try {
    const bytes = strToBytes[inputEncoding](data);
    return $ok({ result: bytes });
  } catch (error) {
    return $err({ msg: 'Crypto Web API - String to Bytes: Failed to convert data', desc: $fmtError(error) });
  }
}

export function $convertBytesToStr(data: Uint8Array | ArrayBuffer, outputEncoding: Encoding = 'utf8'): Result<string> {
  if (!(data instanceof ArrayBuffer || data instanceof Uint8Array)) {
    return $err({
      msg: 'Crypto Web API - Bytes to String: Invalid data type',
      desc: 'Data must be an ArrayBuffer or Uint8Array',
    });
  }
  if (!ENCODING.includes(outputEncoding)) {
    return $err({
      msg: `Crypto Web API - Bytes to String: Unsupported encoding: ${outputEncoding}`,
      desc: 'Use base64, base64url, hex, utf8, or latin1',
    });
  }
  try {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    const str = bytesToStr[outputEncoding](bytes);
    return $ok(str);
  } catch (error) {
    return $err({ msg: 'Crypto Web API - Bytes to String: Failed to convert data', desc: $fmtError(error) });
  }
}

export function $convertEncoding(data: string, from: Encoding, to: Encoding): Result<{ result: string }> {
  if (!$isStr(data)) {
    return $err({
      msg: 'Crypto Web API - Convert Format: Empty data',
      desc: 'Data must be a non-empty string',
    });
  }
  if (!ENCODING.includes(from) || !ENCODING.includes(to)) {
    return $err({
      msg: `Crypto Web API - Convert Format: Unsupported encoding: from ${from} to ${to}`,
      desc: 'Use base64, base64url, hex, utf8, or latin1',
    });
  }

  const bytes = $convertStrToBytes(data, from);
  if (bytes.error) return $err({ msg: bytes.error.message, desc: bytes.error.description });

  const str = $convertBytesToStr(bytes.result, to);
  if (str.error) return $err({ msg: str.error.message, desc: str.error.description });

  return $ok({ result: str.result });
}

const strToBytes = {
  base64: $fromBase64,
  base64url: $fromBase64Url,
  hex: $fromHex,
  latin1: $fromLatin1,
  utf8: (data: string) => textEncoder.encode(data),
} as const satisfies Record<Encoding, (data: string) => Uint8Array<ArrayBuffer>>;

const bytesToStr = {
  base64: $toBase64,
  base64url: $toBase64Url,
  hex: $toHex,
  latin1: $toLatin1,
  utf8: (data: Uint8Array) => textDecoder.decode(data),
} as const satisfies Record<Encoding, (data: Uint8Array) => string>;

function $toLatin1(bytes: Uint8Array): string {
  let out = '';
  const chunk = 1 << 15; // 32KiB per chunk
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return out;
}

function $fromLatin1(data: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const charCode = data.charCodeAt(i);
    if (charCode > 255) throw new Error('Invalid latin1 string');
    out[i] = charCode;
  }
  return out;
}

function $toBase64(bytes: Uint8Array): string {
  return btoa($toLatin1(bytes));
}

function $fromBase64(data: string): Uint8Array<ArrayBuffer> {
  return $fromLatin1(atob(data));
}

function $toBase64Url(bytes: Uint8Array): string {
  return $toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function $fromBase64Url(data: string): Uint8Array<ArrayBuffer> {
  let base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (base64.length % 4)) % 4;
  base64 += '='.repeat(padLen);
  return $fromBase64(base64);
}

function $toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function $fromHex(data: string): Uint8Array<ArrayBuffer> {
  const clean = data.startsWith('0x') ? data.slice(2) : data;
  if (clean.length % 2 !== 0) throw new Error('Invalid hex string');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) throw new Error('Invalid hex string');
    out[i] = byte;
  }
  return out;
}
