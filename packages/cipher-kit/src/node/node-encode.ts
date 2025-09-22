import { Buffer } from 'node:buffer';
import { $err, $fmtError, $fmtResultErr, $ok, type Result } from '~/error';
import type { EncodingFormat } from '~/types';
import { $isStr } from '~/utils';

/**
 * Converts a string to a Buffer (byte array) using the specified encoding format.
 * Supported formats: 'base64', 'base64url', 'hex', 'utf8'.
 *
 * @param data - The input string to convert.
 * @param format - The encoding format to use (default is 'utf8').
 * @returns A Result containing a Node.js Buffer with the encoded data or an error.
 */
export function tryStringToBytes(data: string, format: EncodingFormat = 'utf8'): Result<{ bytes: Buffer }> {
  if (!$isStr(data)) {
    return $err({
      msg: 'Crypto NodeJS API - String to Bytes: Empty data',
      desc: 'Data must be a non-empty string',
    });
  }
  if (!['base64', 'base64url', 'hex', 'utf8'].includes(format)) {
    return $err({
      msg: `Crypto NodeJS API - String to Bytes: Unsupported encode format: ${format}`,
      desc: 'Use base64, base64url, hex, or utf8',
    });
  }
  try {
    return $ok({ bytes: Buffer.from(data, format) });
  } catch (error) {
    return $err({ msg: 'Crypto NodeJS API - String to Bytes: Failed to convert data', desc: $fmtError(error) });
  }
}

/**
 * Converts a Buffer (byte array) to a string using the specified encoding format.
 * Supported formats: 'base64', 'base64url', 'hex', 'utf8'.
 *
 * @param data - The input Buffer to convert.
 * @param format - The encoding format to use (default is 'utf8').
 * @returns A Result containing the string representation of the Buffer or an error.
 */
export function tryBytesToString(data: Buffer, format: EncodingFormat = 'utf8'): Result<string> {
  if (!(data instanceof Buffer)) {
    return $err({
      msg: 'Crypto NodeJS API - Bytes to String: Invalid data type',
      desc: 'Data must be a Buffer',
    });
  }
  if (!['base64', 'base64url', 'hex', 'utf8'].includes(format)) {
    return $err({
      msg: `Crypto NodeJS API - Bytes to String: Unsupported format: ${format}`,
      desc: 'Use base64, base64url, hex, or utf8',
    });
  }
  try {
    return $ok(Buffer.from(data).toString(format));
  } catch (error) {
    return $err({ msg: 'Crypto NodeJS API - Bytes to String: Failed to convert data', desc: $fmtError(error) });
  }
}

// ----------------------------------------------------------------

/**
 * Converts a string to a Buffer (byte array) using the specified encoding format.
 * Supported formats: 'base64', 'base64url', 'hex', 'utf8'.
 *
 * @param data - The input string to convert.
 * @param format - The encoding format to use (default is 'utf8').
 * @returns A Node.js Buffer containing the encoded data.
 * @throws {Error} If the input data is invalid or conversion fails.
 */
export function stringToBytes(data: string, format: EncodingFormat = 'utf8'): Buffer {
  const { bytes, error } = tryStringToBytes(data, format);
  if (error) throw new Error($fmtResultErr(error));
  return bytes;
}

/**
 * Converts a Buffer (byte array) to a string using the specified encoding format.
 * Supported formats: 'base64', 'base64url', 'hex', 'utf8'.
 *
 * @param data - The input Buffer to convert.
 * @param format - The encoding format to use (default is 'utf8').
 * @returns A string representation of the Buffer in the specified format.
 * @throws {Error} If the input data is invalid or conversion fails.
 */
export function bytesToString(data: Buffer, format: EncodingFormat = 'utf8'): string {
  const { result, error } = tryBytesToString(data, format);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}
