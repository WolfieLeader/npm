import nodeCrypto from 'node:crypto';
import type { NodeKey, WebApiKey } from '~/helpers/types';

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

/** Regular expressions for encrypted data patterns */
export const ENCRYPTED_REGEX = Object.freeze({
  general: /^(?:[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)?\.)$/,
  node: /^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.$/,
  web: /^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.$/,
});

/** Checks if the input string matches the specified encrypted data pattern. */
export function matchPattern(data: string, format: 'general' | 'node' | 'web'): boolean {
  if (typeof data !== 'string') return false;
  if (!(format in ENCRYPTED_REGEX)) throw new Error(`Unknown format: ${format}`);
  return ENCRYPTED_REGEX[format].test(data);
}

/** Checks if the input is a valid Node.js key. */
export function isNodeKey(key: unknown): key is NodeKey {
  return key instanceof nodeCrypto.KeyObject;
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
