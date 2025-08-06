import nodeCrypto from 'node:crypto';
import type { WebApiKey } from '~/types';
import { $err, $ok, $stringifyError, type Result } from './error';

export const NODE_ALGORITHM = 'aes-256-gcm';
export const WEB_API_ALGORITHM = 'AES-GCM';

export const ENCRYPTION_REGEX = Object.freeze({
  GENERAL: /^(?:[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)?\.)$/,
  NODE: /^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.$/,
  WEB_API: /^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.$/,
});

export function isInEncryptionFormat(data: string): boolean {
  return typeof data === 'string' && ENCRYPTION_REGEX.GENERAL.test(data);
}

export function isInNodeEncryptionFormat(data: string): boolean {
  return typeof data === 'string' && ENCRYPTION_REGEX.NODE.test(data);
}

export function isInWebApiEncryptionFormat(data: string): boolean {
  return typeof data === 'string' && ENCRYPTION_REGEX.WEB_API.test(data);
}

export function $isStr(value: unknown, min = 0): value is string {
  return (value !== null || value !== undefined) && typeof value === 'string' && value.trim().length >= min;
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

export function isNodeKey(key: unknown): key is nodeCrypto.KeyObject {
  return key instanceof nodeCrypto.KeyObject;
}

export function stringifyObj(obj: Record<string, unknown>): Result<string> {
  if (!$isObj(obj)) return $err({ msg: 'Invalid object', desc: 'Input is not a plain object' });

  try {
    return $ok(JSON.stringify(obj));
  } catch (error) {
    return $err({ msg: 'Stringify error', desc: $stringifyError(error) });
  }
}

export function parseToObj(str: string): Result<{ result: Record<string, unknown> }> {
  if (!$isStr(str)) return $err({ msg: 'Invalid input', desc: 'Input is not a valid string' });

  try {
    const obj = JSON.parse(str);
    if (!$isObj(obj)) {
      return $err({ msg: 'Invalid object format', desc: 'Parsed data is not a plain object' });
    }

    return $ok({ result: obj });
  } catch (error) {
    return $err({ msg: 'Invalid format', desc: $stringifyError(error) });
  }
}
