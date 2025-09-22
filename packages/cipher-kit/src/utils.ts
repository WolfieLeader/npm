import nodeCrypto from 'node:crypto';
import type { NodeKey, WebApiKey } from '~/types';
import { $err, $fmtError, $fmtResultErr, $ok, type Result } from './error';

export function $isStr(value: unknown, min = 1): value is string {
  return value !== null && value !== undefined && typeof value === 'string' && value.trim().length >= min;
}

export function $isObj(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    value !== undefined &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
  );
}

export const CONFIG = Object.freeze({
  hash: {
    sha256: { node: 'sha256', web: 'SHA-256' },
    sha512: { node: 'sha512', web: 'SHA-512' },
  },
  encrypt: {
    aes256gcm: { ivLength: 12, node: 'aes-256-gcm', web: 'AES-GCM' },
  },
  password: {
    pbkdf2: { saltLength: 16, iterations: 320_000, keyLength: 64 },
  },
} as const);

export const encodingFormats = Object.freeze(['base64', 'base64url', 'hex', 'utf8', 'binary'] as const);

/** Regular expressions for encrypted data formats */
export const ENCRYPTED_REGEX = Object.freeze({
  GENERAL: /^(?:[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)?\.)$/,
  NODE: /^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.$/,
  WEB_API: /^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.$/,
});

export function checkFormat(data: string, format: 'general' | 'node' | 'web'): boolean {
  if (typeof data !== 'string') return false;
  switch (format) {
    case 'general':
      return ENCRYPTED_REGEX.GENERAL.test(data);
    case 'node':
      return ENCRYPTED_REGEX.NODE.test(data);
    case 'web':
      return ENCRYPTED_REGEX.WEB_API.test(data);
    default:
      throw new Error(`Unknown format: ${format}`);
  }
}

/** Checks if the input is a valid Web API key. */
export function isWebApiKey(key: unknown): key is WebApiKey {
  return (
    key !== null &&
    key !== undefined &&
    typeof key === 'object' &&
    'type' in key &&
    typeof key.type === 'string' &&
    'algorithm' in key &&
    typeof key.algorithm === 'object' &&
    'extractable' in key &&
    typeof key.extractable === 'boolean' &&
    'usages' in key &&
    Array.isArray(key.usages) &&
    key.usages.every((usage) => typeof usage === 'string')
  );
}

/** Checks if the input is a valid Node.js key. */
export function isNodeKey(key: unknown): key is NodeKey {
  return key instanceof nodeCrypto.KeyObject;
}

/**
 * Stringify an object.
 *
 * @param obj - The object to stringify.
 * @returns An JSON string.
 * @throws {Error} If the object cannot be stringified.
 */
export function stringifyObj<T extends object = Record<string, unknown>>(obj: T): string {
  const { result, error } = tryStringifyObj(obj);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Parse a string to an object.
 *
 * @param str - The JSON string to parse.
 * @returns A parsed object.
 * @throws {Error} If the string cannot be parsed or is not a valid object.
 */
export function parseToObj<T extends object = Record<string, unknown>>(str: string): T {
  const { result, error } = tryParseToObj<T>(str);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Stringify an object.
 *
 * @param obj - The object to stringify.
 * @returns A Result containing the JSON string or an error.
 */
export function tryStringifyObj<T extends object = Record<string, unknown>>(obj: T): Result<string> {
  try {
    if (!$isObj(obj)) return $err({ msg: 'Invalid object', desc: 'Input is not a plain object' });
    return $ok(JSON.stringify(obj));
  } catch (error) {
    return $err({ msg: 'Utility: Stringify error', desc: $fmtError(error) });
  }
}

/**
 * Parse a string to an object.
 *
 * @param str - The JSON string to parse.
 * @returns A Result containing the parsed object or an error.
 */
export function tryParseToObj<T extends object = Record<string, unknown>>(str: string): Result<{ result: T }> {
  try {
    if (!$isStr(str)) return $err({ msg: 'Utility: Invalid input', desc: 'Input is not a valid string' });
    const obj = JSON.parse(str);

    if (!$isObj(obj)) return $err({ msg: 'Utility: Invalid object format', desc: 'Parsed data is not a plain object' });
    return $ok({ result: obj as T });
  } catch (error) {
    return $err({ msg: 'Utility: Invalid format', desc: $fmtError(error) });
  }
}
