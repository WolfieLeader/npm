import { $err, $fmtError, $fmtResultErr, $ok, type Result } from '~/error';
import type { EncodingFormat } from '~/types';
import { $isStr, encodingFormats } from '~/utils';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const strToBytesFuncs = {
  base64: $fromBase64,
  base64url: $fromBase64Url,
  hex: $fromHex,
  utf8: (data: string) => textEncoder.encode(data),
  binary: $fromBinary,
} as const satisfies Record<EncodingFormat, (data: string) => Uint8Array<ArrayBuffer>>;

const bytesToStrFuncs = {
  base64: $toBase64,
  base64url: $toBase64Url,
  hex: $toHex,
  utf8: (data: Uint8Array) => textDecoder.decode(data),
  binary: $toBinary,
} as const satisfies Record<EncodingFormat, (data: Uint8Array<ArrayBuffer>) => string>;

/**
 * Convert data from one encoding format to another.
 *
 * @param data - The input data to convert.
 * @param from - The encoding format to convert from.
 * @param to - The encoding format to convert to.
 * @returns A Result containing the converted string or an error.
 */
export function tryConvertToFormat(data: string, from: EncodingFormat, to: EncodingFormat): Result<{ result: string }> {
  if (!$isStr(data)) {
    return $err({
      msg: 'Crypto Web API - Convert Format: Empty data',
      desc: 'Data must be a non-empty string',
    });
  }
  if (!encodingFormats.includes(from) || !encodingFormats.includes(to)) {
    return $err({
      msg: `Crypto Web API - Convert Format: Unsupported format: from ${from} to ${to}`,
      desc: 'Use base64, base64url, hex, utf8, or binary',
    });
  }
  const { bytes, error: toBytesError } = tryStringToBytes(data, from);
  if (toBytesError) {
    return $err({
      msg: 'Crypto Web API - Convert Format: Failed to convert to bytes',
      desc: toBytesError.description,
    });
  }
  const { result, error: toStringError } = tryBytesToString(bytes, to);
  if (toStringError) {
    return $err({
      msg: 'Crypto Web API - Convert Format: Failed to convert to string',
      desc: toStringError.description,
    });
  }

  return $ok({ result });
}

/**
 * Converts a string to a Uint8Array (byte array) using the specified encoding format.
 * Supported formats: 'base64', 'base64url', 'hex', 'utf8', 'binary'.
 *
 * @param data - The input string to convert.
 * @param format - The encoding format to use (default is 'utf8').
 * @returns A Result containing a Uint8Array with the encoded data or an error.
 */
export function tryStringToBytes(
  data: string,
  format: EncodingFormat = 'utf8',
): Result<{ bytes: Uint8Array<ArrayBuffer> }> {
  if (!$isStr(data)) {
    return $err({
      msg: 'Crypto Web API - String to Bytes: Empty data',
      desc: 'Data must be a non-empty string',
    });
  }
  if (!encodingFormats.includes(format)) {
    return $err({
      msg: `Crypto Web API - String to Bytes: Unsupported encode format: ${format}`,
      desc: 'Use base64, base64url, hex, utf8, or binary',
    });
  }

  try {
    const bytes = strToBytesFuncs[format](data);
    return $ok({ bytes });
  } catch (error) {
    return $err({ msg: 'Crypto Web API - String to Bytes: Failed to convert data', desc: $fmtError(error) });
  }
}

/**
 * Converts a Uint8Array or ArrayBuffer (byte array) to a string using the specified encoding format.
 * Supported formats: 'base64', 'base64url', 'hex', 'utf8', 'binary'.
 *
 * @param data - The input Uint8Array or ArrayBuffer to convert.
 * @param format - The encoding format to use (default is 'utf8').
 * @returns A Result containing the string representation of the Uint8Array or ArrayBuffer or an error.
 */
export function tryBytesToString(
  data: ArrayBuffer | Uint8Array<ArrayBuffer>,
  format: EncodingFormat = 'utf8',
): Result<string> {
  if (!(data instanceof ArrayBuffer || data instanceof Uint8Array)) {
    return $err({
      msg: 'Crypto Web API - Bytes to String: Invalid data type',
      desc: 'Data must be an ArrayBuffer or Uint8Array',
    });
  }
  if (!encodingFormats.includes(format)) {
    return $err({
      msg: `Crypto Web API - Bytes to String: Unsupported format: ${format}`,
      desc: 'Use base64, base64url, hex, utf8, or binary',
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

function $toBinary(bytes: Uint8Array<ArrayBuffer>): string {
  let out = '';
  const chunk = 1 << 15; // 32KiB per chunk
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return out;
}

function $fromBinary(data: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const charCode = data.charCodeAt(i);
    if (charCode > 255) throw new Error('Invalid binary string');
    out[i] = charCode;
  }
  return out;
}

function $toBase64(bytes: Uint8Array<ArrayBuffer>): string {
  return btoa($toBinary(bytes));
}

function $fromBase64(data: string): Uint8Array<ArrayBuffer> {
  return $fromBinary(atob(data));
}

function $toBase64Url(bytes: Uint8Array<ArrayBuffer>): string {
  return $toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function $fromBase64Url(data: string): Uint8Array<ArrayBuffer> {
  let base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (base64.length % 4)) % 4;
  base64 += '='.repeat(padLen);
  return $fromBase64(base64);
}

function $toHex(bytes: Uint8Array<ArrayBuffer>): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function $fromHex(data: string): Uint8Array<ArrayBuffer> {
  const clean = data.startsWith('0x') ? data.slice(2) : data;
  if (clean.length % 2 !== 0) throw new Error('Invalid hex string');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

// ----------------------------------------------------------------

/**
 * Convert data from one encoding format to another.
 *
 * @param data - The input data to convert.
 * @param from - The encoding format to convert from.
 * @param to - The encoding format to convert to.
 * @returns A converted string.
 * @throws {Error} If the input data is invalid or conversion fails.
 */
export function convertToFormat(data: string, from: EncodingFormat, to: EncodingFormat): string {
  const { result, error } = tryConvertToFormat(data, from, to);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Converts a string to a Uint8Array (byte array) using the specified encoding format.
 * Supported formats: 'base64', 'base64url', 'hex', 'utf8', 'binary'.
 *
 * @param data - The input string to convert.
 * @param format - The encoding format to use (default is 'utf8').
 * @returns A Uint8Array containing the encoded data.
 * @throws {Error} If the input data is invalid or conversion fails.
 */
export function stringToBytes(data: string, format: EncodingFormat = 'utf8'): Uint8Array<ArrayBuffer> {
  const { bytes, error } = tryStringToBytes(data, format);
  if (error) throw new Error($fmtResultErr(error));
  return bytes;
}

/**
 * Converts a Uint8Array or ArrayBuffer (byte array) to a string using the specified encoding format.
 * Supported formats: 'base64', 'base64url', 'hex', 'utf8', 'binary'.
 *
 * @param data - The input Uint8Array or ArrayBuffer to convert.
 * @param format - The encoding format to use (default is 'utf8').
 * @returns A string representation of the Uint8Array or ArrayBuffer in the specified format.
 * @throws {Error} If the input data is invalid or conversion fails.
 */
export function bytesToString(data: ArrayBuffer | Uint8Array<ArrayBuffer>, format: EncodingFormat = 'utf8'): string {
  const { result, error } = tryBytesToString(data, format);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}
