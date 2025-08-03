import type nodeCrypto from 'node:crypto';
import type { webcrypto } from 'node:crypto';

export type WebApiKey = webcrypto.CryptoKey;
export type NodeKey = nodeCrypto.KeyObject;

export function $isString(value: unknown): value is string {
  return (value !== null || value !== undefined) && typeof value === 'string' && value.trim().length > 0;
}

export function $isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
  );
}
