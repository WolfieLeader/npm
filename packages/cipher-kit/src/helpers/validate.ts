import nodeCrypto from "node:crypto";
import type { SecretKey } from "~/helpers/types";
import { DIGEST_ALGORITHMS, ENCRYPTION_ALGORITHMS } from "./consts";

export function $isStr(x: unknown, min = 1): x is string {
  return x !== null && x !== undefined && typeof x === "string" && x.trim().length >= min;
}

export function $isPlainObj<T extends object = Record<string, unknown>>(x: unknown): x is T {
  if (typeof x !== "object" || x === null || x === undefined) return false;
  const proto = Object.getPrototypeOf(x);
  return proto === Object.prototype || proto === null;
}

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
    typeof x.key.extractable !== "boolean" ||
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
 * - **node**: `"iv.cipher.tag."` (three dot-separated parts plus a trailing dot)
 * - **web**: `"iv.cipherWithTag."` (two parts plus a trailing dot)
 * - **general**: accepts both shapes (2 or 3 parts) with a trailing dot
 *
 * Each part is any non-empty string without dots.
 *
 * ### 🍼 Explain Like I'm Five
 * You have a secret code you want to check. Before you check it,
 * you make sure it looks how a secret code should look.
 */
export const ENCRYPTED_REGEX = Object.freeze({
  node: /^([^.]+)\.([^.]+)\.([^.]+)\.$/,
  web: /^([^.]+)\.([^.]+)\.$/,
  general: /^([^.]+)\.([^.]+)(?:\.([^.]+))?\.$/,
});

/**
 * Checks if a string matches an expected encrypted payload shape.
 *
 * - **node**: `"iv.cipher.tag."` (three dot-separated parts plus a trailing dot)
 * - **web**: `"iv.cipherWithTag."` (two parts plus a trailing dot)
 * - **general**: accepts both shapes (2 or 3 parts) with a trailing dot
 *
 * Each part is any non-empty string without dots.
 *
 * This validates only the **shape**, not whether content is valid base64/hex, etc.
 *
 * ### 🍼 Explain Like I'm Five
 * You have a secret code you want to check. Before you check it,
 * you make sure it looks how a secret code should look.
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
 * matchEncryptedPattern("abc.def.ghi.", "general"); // true
 * ```
 */
export function matchEncryptedPattern(data: string, format: "general" | "node" | "web"): boolean {
  if (typeof data !== "string") return false;
  if (!(format in ENCRYPTED_REGEX)) throw new Error(`Unknown format: ${format}`);
  return ENCRYPTED_REGEX[format].test(data);
}
