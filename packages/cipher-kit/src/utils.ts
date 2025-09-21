import nodeCrypto from 'node:crypto';
import type { NodeKey, WebApiKey } from '~/types';
import { $err, $fmtError, $ok, type Result } from './error';

export const NODE_ALGORITHM = 'aes-256-gcm';
export const WEB_API_ALGORITHM = 'AES-GCM';

export const ENCRYPTED_REGEX = Object.freeze({
  GENERAL: /^(?:[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)?\.)$/,
  NODE: /^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.$/,
  WEB_API: /^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.$/,
});

export function isInEncryptedFormat(data: string): boolean {
  return typeof data === 'string' && ENCRYPTED_REGEX.GENERAL.test(data);
}

export function isInNodeEncryptedFormat(data: string): boolean {
  return typeof data === 'string' && ENCRYPTED_REGEX.NODE.test(data);
}

export function isInWebApiEncryptedFormat(data: string): boolean {
  return typeof data === 'string' && ENCRYPTED_REGEX.WEB_API.test(data);
}

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

export function isNodeKey(key: unknown): key is NodeKey {
  return key instanceof nodeCrypto.KeyObject;
}

export function stringifyObj<T extends object = Record<string, unknown>>(obj: T): Result<string> {
  try {
    if (!$isObj(obj)) return $err({ msg: 'Invalid object', desc: 'Input is not a plain object' });
    return $ok(JSON.stringify(obj));
  } catch (error) {
    return $err({ msg: 'Utility: Stringify error', desc: $fmtError(error) });
  }
}

export function parseToObj<T extends object = Record<string, unknown>>(str: string): Result<{ result: T }> {
  try {
    if (!$isStr(str)) return $err({ msg: 'Utility: Invalid input', desc: 'Input is not a valid string' });
    const obj = JSON.parse(str);

    if (!$isObj(obj)) return $err({ msg: 'Utility: Invalid object format', desc: 'Parsed data is not a plain object' });
    return $ok({ result: obj as T });
  } catch (error) {
    return $err({ msg: 'Utility: Invalid format', desc: $fmtError(error) });
  }
}
