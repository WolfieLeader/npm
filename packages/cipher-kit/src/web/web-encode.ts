import { $err, $fmtError, $fmtResultErr, $ok, type Result } from '~/error';
import type { EncodingFormat } from '~/types';
import { $isStr } from '~/utils';

export function stringToBytes(data: string, format: EncodingFormat = 'utf8'): Uint8Array {
  const { bytes, error } = tryStringToBytes(data, format);
  if (error) throw new Error($fmtResultErr(error));
  return bytes;
}

export function bytesToString(data: ArrayBuffer | Uint8Array, format: EncodingFormat = 'utf8'): string {
  const { result, error } = tryBytesToString(data, format);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

// ----------------------------------------------------------------

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const strToBytesFuncs = {
  base64: $fromBase64,
  base64url: $fromBase64Url,
  hex: $fromHex,
  utf8: (data: string) => textEncoder.encode(data),
} as const satisfies Record<EncodingFormat, (data: string) => Uint8Array>;

const bytesToStrFuncs = {
  base64: $toBase64,
  base64url: $toBase64Url,
  hex: $toHex,
  utf8: (data: Uint8Array) => textDecoder.decode(data),
} as const satisfies Record<EncodingFormat, (data: Uint8Array) => string>;

export function tryStringToBytes(data: string, format: EncodingFormat = 'utf8'): Result<{ bytes: Uint8Array }> {
  if (!$isStr(data)) {
    return $err({
      msg: 'Crypto Web API - String to Bytes: Empty data',
      desc: 'Data must be a non-empty string',
    });
  }
  if (!(format in strToBytesFuncs)) {
    return $err({
      msg: `Crypto Web API - String to Bytes: Unsupported encode format: ${format}`,
      desc: 'Use base64, base64url, hex, or utf8',
    });
  }

  try {
    const bytes = strToBytesFuncs[format](data);
    return $ok({ bytes });
  } catch (error) {
    return $err({ msg: 'Crypto Web API - String to Bytes: Failed to convert data', desc: $fmtError(error) });
  }
}

export function tryBytesToString(data: ArrayBuffer | Uint8Array, format: EncodingFormat = 'utf8'): Result<string> {
  if (!(data instanceof ArrayBuffer || data instanceof Uint8Array)) {
    return $err({
      msg: 'Crypto Web API - Bytes to String: Invalid data type',
      desc: 'Data must be an ArrayBuffer or Uint8Array',
    });
  }
  if (!(format in bytesToStrFuncs)) {
    return $err({
      msg: `Crypto Web API - Bytes to String: Unsupported format: ${format}`,
      desc: 'Use base64, base64url, hex, or utf8',
    });
  }
  try {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    const str = bytesToStrFuncs[format](bytes);
    return $ok(str);
  } catch (error) {
    return $err({ msg: 'Crypto Web API - Bytes to String: Failed to convert data', desc: $fmtError(error) });
  }
}

function $toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000; // 32KB per chunk
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function $fromBase64(data: string): Uint8Array {
  const binary = atob(data);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function $toBase64Url(bytes: Uint8Array): string {
  return $toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function $fromBase64Url(data: string): Uint8Array {
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

function $fromHex(data: string): Uint8Array {
  const clean = data.startsWith('0x') ? data.slice(2) : data;
  if (clean.length % 2 !== 0) throw new Error('Invalid hex string');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
