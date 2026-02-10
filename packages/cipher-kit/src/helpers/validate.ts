import nodeCrypto from "node:crypto";
import type { SecretKey } from "~/helpers/types.js";
import { DIGEST_ALGORITHMS, ENCRYPTION_ALGORITHMS } from "./consts.js";

export { $isPlainObj, $isStr } from "@internal/helpers";

export function $isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && x !== undefined;
}

type InjectedSecretKey<Platform extends "web" | "node"> = SecretKey<Platform> & {
  readonly injected: (typeof ENCRYPTION_ALGORITHMS)[keyof typeof ENCRYPTION_ALGORITHMS];
};

const expectedKeys = new Set(["platform", "digest", "algorithm", "key"]);

export function $isSecretKey<Platform extends "node" | "web">(
  x: unknown,
  platform: Platform,
): InjectedSecretKey<Platform> | null {
  if (!$isObj(x) || (platform !== "node" && platform !== "web") || x.platform !== platform) return null;

  const keys = Object.keys(x);
  if (keys.length !== expectedKeys.size) return null;
  for (const key of keys) if (!expectedKeys.has(key)) return null;
  for (const key of expectedKeys) if (!Object.hasOwn(x, key)) return null;

  if (
    typeof x.digest !== "string" ||
    !(x.digest in DIGEST_ALGORITHMS) ||
    typeof x.algorithm !== "string" ||
    !(x.algorithm in ENCRYPTION_ALGORITHMS) ||
    !$isObj(x.key) ||
    x.key.type !== "secret"
  ) {
    return null;
  }

  const algorithm = ENCRYPTION_ALGORITHMS[x.algorithm as keyof typeof ENCRYPTION_ALGORITHMS];

  if (platform === "node") {
    if (
      !(x.key instanceof nodeCrypto.KeyObject) ||
      (typeof x.key.symmetricKeySize === "number" && x.key.symmetricKeySize !== algorithm.keyBytes)
    ) {
      return null;
    }
    return Object.freeze({ ...x, injected: algorithm }) as InjectedSecretKey<Platform>;
  }

  if (
    !$isObj(x.key.algorithm) ||
    x.key.algorithm.name !== algorithm.web ||
    (typeof x.key.algorithm.length === "number" && x.key.algorithm.length !== algorithm.keyBytes * 8) ||
    !Array.isArray(x.key.usages) ||
    x.key.usages.length !== 2 ||
    !(x.key.usages.includes("encrypt") && x.key.usages.includes("decrypt"))
  ) {
    return null;
  }
  return Object.freeze({ ...x, injected: algorithm }) as InjectedSecretKey<Platform>;
}

/**
 * Regular expressions for encrypted data patterns.
 *
 * - **node**: `"iv.cipher.tag."` — three dot-separated parts plus trailing dot.
 * - **web**: `"iv.cipherWithTag."` — two parts plus trailing dot.
 * - **general**: accepts both shapes (2 or 3 parts) with trailing dot.
 *
 * @see {@link matchEncryptedPattern} Convenience function wrapping these regexes.
 */
export const ENCRYPTED_REGEX = Object.freeze({
  node: /^([^.]+)\.([^.]+)\.([^.]+)\.$/,
  web: /^([^.]+)\.([^.]+)\.$/,
  general: /^([^.]+)\.([^.]+)(?:\.([^.]+))?\.$/,
});

/**
 * Checks if a string matches an expected encrypted payload shape.
 *
 * @remarks
 * Validates only the structural shape, not whether content is valid base64/hex.
 *
 * @param data - The string to test.
 * @param format - Which layout to check: `'node'`, `'web'`, or `'general'`.
 * @returns `true` if the string matches the pattern; otherwise `false`.
 * @throws {Error} If an unknown `format` is provided.
 *
 * @example
 * ```ts
 * matchEncryptedPattern("abc.def.ghi.", "node");    // true
 * matchEncryptedPattern("abc.def.", "web");         // true
 * matchEncryptedPattern("abc.def.", "node");        // false
 * ```
 *
 * @see {@link ENCRYPTED_REGEX} Underlying regex map.
 */
export function matchEncryptedPattern(data: string, format: "node" | "web" | "general"): boolean {
  if (typeof data !== "string") return false;
  if (!(format in ENCRYPTED_REGEX)) throw new Error(`Unknown format: ${format}`);
  return ENCRYPTED_REGEX[format].test(data);
}
