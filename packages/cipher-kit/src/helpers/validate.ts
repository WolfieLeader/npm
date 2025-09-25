import nodeCrypto from 'node:crypto';
import type { SecretKey } from '~/helpers/types';
import { DIGEST_ALGORITHMS, ENCRYPTION_ALGORITHMS } from './consts';

export function $isStr(x: unknown, min = 1): x is string {
  return x !== null && x !== undefined && typeof x === 'string' && x.trim().length >= min;
}

export function $isObj(x: unknown): x is Record<string, unknown> {
  if (typeof x !== 'object' || x === null || x === undefined) return false;
  const proto = Object.getPrototypeOf(x);
  return proto === Object.prototype || proto === null;
}

export function $isLooseObj(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && x !== undefined;
}

const expectedKeys = new Set(['platform', 'digest', 'algo', 'key']);
const expectedAlgoKeys = new Set(['name', 'keyBytes', 'ivLength', 'node', 'web']);

export function isSecretKey<Platform extends 'node' | 'web'>(x: unknown, platform: Platform): x is SecretKey<Platform> {
  if (!$isLooseObj(x) || (platform !== 'node' && platform !== 'web') || x.platform !== platform) return false;

  const keys = Object.keys(x);
  if (keys.length !== expectedKeys.size) return false;
  for (const key of keys) if (!expectedKeys.has(key)) return false;
  for (const key of expectedKeys) if (!Object.hasOwn(x, key)) return false;

  if (typeof x.digest !== 'string' || !(x.digest in DIGEST_ALGORITHMS)) return false;
  if (!$isLooseObj(x.algo) || typeof x.algo.name !== 'string' || !(x.algo.name in ENCRYPTION_ALGORITHMS)) return false;

  const algoKeys = Object.keys(x.algo);
  if (algoKeys.length !== expectedAlgoKeys.size) return false;
  for (const key of algoKeys) if (!expectedAlgoKeys.has(key)) return false;
  for (const key of expectedAlgoKeys) if (!Object.hasOwn(x.algo, key)) return false;

  const algo = ENCRYPTION_ALGORITHMS[x.algo.name as keyof typeof ENCRYPTION_ALGORITHMS];
  if (
    x.algo.keyBytes !== algo.keyBytes ||
    x.algo.ivLength !== algo.ivLength ||
    x.algo.node !== algo.node ||
    x.algo.web !== algo.web
  ) {
    return false;
  }

  if (!$isLooseObj(x.key) || x.key.type !== 'secret') return false;

  if (platform === 'node') {
    if (
      !(x.key instanceof nodeCrypto.KeyObject) ||
      (typeof x.key.symmetricKeySize === 'number' && x.key.symmetricKeySize !== algo.keyBytes)
    ) {
      return false;
    }
    return true;
  }

  if (
    !$isLooseObj(x.key.algorithm) ||
    x.key.algorithm.name !== algo.web ||
    (typeof x.key.algorithm.length === 'number' && x.key.algorithm.length !== algo.keyBytes * 8) ||
    typeof x.key.extractable !== 'boolean' ||
    !Array.isArray(x.key.usages) ||
    x.key.usages.length !== 2 ||
    !(x.key.usages.includes('encrypt') && x.key.usages.includes('decrypt'))
  ) {
    return false;
  }
  return true;
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
