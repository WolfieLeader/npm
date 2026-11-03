import { $fmtResultErr } from "@internal/helpers";
import type { Result } from "@internal/helpers";
import { $guard } from "~/helpers/guard.js";
import type { CreateSecretKeyOptions, DecryptOptions, EncryptOptions } from "~/helpers/types.js";
import { $decrypt, $decryptObj, $encrypt, $encryptObj } from "./node-encrypt.js";
import { $createSecretKey, $isNodeSecretKey } from "./node-secret-key.js";
import type { NodeSecretKey } from "./node-secret-key.js";

/**
 * Checks whether a value is a `NodeSecretKey` for the Node.js platform.
 *
 * @param x - The value to check.
 * @returns `true` if `x` is a `NodeSecretKey`.
 *
 * @example
 * ```ts
 * isNodeSecretKey(nodeKey); // true
 * isNodeSecretKey({});      // false
 * ```
 */
export function isNodeSecretKey(x: unknown): x is NodeSecretKey {
  return $isNodeSecretKey(x) !== null;
}

/**
 * Derives a `NodeSecretKey` from a high-entropy secret (non-throwing).
 *
 * @returns `Result<{ result: NodeSecretKey }>` with the derived key or error.
 * @see {@link createSecretKey} For full parameter/behavior docs.
 */
export function tryCreateSecretKey(
  secret: string,
  options: CreateSecretKeyOptions = {},
): Result<{ result: NodeSecretKey }> {
  return $guard("node createSecretKey", () => $createSecretKey(secret, options));
}

/**
 * Derives a `NodeSecretKey` from a high-entropy secret for encryption/decryption.
 *
 * @remarks
 * Uses HKDF to derive a symmetric key from the input string.
 *
 * @param secret - High-entropy secret (min 8 chars). For human-chosen passwords, use {@link hashPassword} instead.
 * @param options - Key derivation options.
 * @returns The derived `NodeSecretKey`.
 * @throws {Error} If key derivation fails.
 *
 * @example
 * ```ts
 * const secretKey = createSecretKey("my-32-char-high-entropy-secret!!");
 * ```
 *
 * @see {@link tryCreateSecretKey} Non-throwing variant returning `Result`.
 */
export function createSecretKey(secret: string, options: CreateSecretKeyOptions = {}): NodeSecretKey {
  const { result, error } = tryCreateSecretKey(secret, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Encrypts a UTF-8 string (non-throwing).
 *
 * @returns `Result<string>` with the ciphertext or error.
 * @see {@link encrypt} For full parameter/behavior docs.
 */
export function tryEncrypt(data: string, secretKey: NodeSecretKey, options: EncryptOptions = {}): Result<string> {
  return $guard("node encrypt", () => $encrypt(data, secretKey, options));
}

/**
 * Encrypts a UTF-8 string using the provided `NodeSecretKey`.
 *
 * @remarks
 * Output format: `"iv.cipher.tag."` (three dot-separated base64url segments plus trailing dot).
 * Cross-platform compatible — data encrypted on Node can be decrypted on Web and vice versa.
 * AES-GCM uses random 96-bit IVs. Rotate keys before ~2^32 encryptions with the same key to avoid nonce collision.
 *
 * @param data - UTF-8 string to encrypt. Any non-empty, well-formed string is accepted, including whitespace-only
 *   strings. Empty strings and strings with lone UTF-16 surrogates are rejected.
 * @param secretKey - The `NodeSecretKey` used for encryption.
 * @param options - Encryption options.
 * @returns The encrypted string.
 * @throws {Error} If the input or key is invalid, or encryption fails.
 *
 * @example
 * ```ts
 * const secretKey = createSecretKey("my-secret");
 * const encrypted = encrypt("Hello, World!", secretKey);
 * ```
 *
 * @see {@link tryEncrypt} Non-throwing variant returning `Result<string>`.
 */
export function encrypt(data: string, secretKey: NodeSecretKey, options: EncryptOptions = {}): string {
  const { result, error } = tryEncrypt(data, secretKey, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Decrypts a ciphertext string (non-throwing).
 *
 * @returns `Result<string>` with the plaintext or error.
 * @see {@link decrypt} For full parameter/behavior docs.
 */
export function tryDecrypt(encrypted: string, secretKey: NodeSecretKey, options: DecryptOptions = {}): Result<string> {
  return $guard("node decrypt", () => $decrypt(encrypted, secretKey, options));
}

/**
 * Decrypts a ciphertext string using the provided `NodeSecretKey`.
 *
 * @remarks
 * Expects input in the format `"iv.cipher.tag."`.
 * Cross-platform compatible — data encrypted on Web can be decrypted on Node and vice versa.
 *
 * @param encrypted - The encrypted string to decrypt.
 * @param secretKey - The `NodeSecretKey` used for decryption.
 * @param options - Decryption options.
 * @returns The decrypted UTF-8 string.
 * @throws {Error} If the input or key is invalid, or decryption fails.
 *
 * @example
 * ```ts
 * const secretKey = createSecretKey("my-secret");
 * const encrypted = encrypt("Hello, World!", secretKey);
 * const decrypted = decrypt(encrypted, secretKey); // "Hello, World!"
 * ```
 *
 * @see {@link tryDecrypt} Non-throwing variant returning `Result<string>`.
 */
export function decrypt(encrypted: string, secretKey: NodeSecretKey, options: DecryptOptions = {}): string {
  const { result, error } = tryDecrypt(encrypted, secretKey, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Encrypts a plain object (non-throwing).
 *
 * @returns `Result<string>` with the ciphertext or error.
 * @see {@link encryptObj} For full parameter/behavior docs.
 */
export function tryEncryptObj<T extends object = Record<string, unknown>>(
  obj: T,
  secretKey: NodeSecretKey,
  options: EncryptOptions = {},
): Result<string> {
  return $guard("node encryptObj", () => $encryptObj(obj, secretKey, options));
}

/**
 * Encrypts a plain object using the provided `NodeSecretKey`.
 *
 * @remarks
 * Only plain objects (POJOs) are accepted; class instances, Maps, Sets, etc. are rejected.
 * Output format: `"iv.cipher.tag."`.
 *
 * @param obj - Plain object to encrypt.
 * @param secretKey - The `NodeSecretKey` used for encryption.
 * @param options - Encryption options.
 * @returns The encrypted string.
 * @throws {Error} If the input or key is invalid, or encryption fails.
 *
 * @example
 * ```ts
 * const secretKey = createSecretKey("my-secret");
 * const encrypted = encryptObj({ a: 1 }, secretKey);
 * ```
 *
 * @see {@link tryEncryptObj} Non-throwing variant returning `Result<string>`.
 */
export function encryptObj<T extends object = Record<string, unknown>>(
  obj: T,
  secretKey: NodeSecretKey,
  options: EncryptOptions = {},
): string {
  const { result, error } = tryEncryptObj(obj, secretKey, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Decrypts an encrypted JSON string into a plain object (non-throwing).
 *
 * @returns `Result<{ result: T }>` with the object or error.
 * @see {@link decryptObj} For full parameter/behavior docs.
 */
export function tryDecryptObj<T extends object = Record<string, unknown>>(
  encrypted: string,
  secretKey: NodeSecretKey,
  options: DecryptOptions = {},
): Result<{ result: T }> {
  return $guard("node decryptObj", () => $decryptObj<T>(encrypted, secretKey, options));
}

/**
 * Decrypts an encrypted JSON string into a plain object.
 *
 * @remarks
 * Expects input in the format `"iv.cipher.tag."`.
 *
 * @param encrypted - The encrypted string.
 * @param secretKey - The `NodeSecretKey` used for decryption.
 * @param options - Decryption options.
 * @returns The decrypted object.
 * @throws {Error} If decryption or JSON parsing fails.
 *
 * @example
 * ```ts
 * const secretKey = createSecretKey("my-secret");
 * const encrypted = encryptObj({ a: 1 }, secretKey);
 * const obj = decryptObj<{ a: number }>(encrypted, secretKey); // obj.a === 1
 * ```
 *
 * @see {@link tryDecryptObj} Non-throwing variant returning `Result`.
 */
export function decryptObj<T extends object = Record<string, unknown>>(
  encrypted: string,
  secretKey: NodeSecretKey,
  options: DecryptOptions = {},
): T {
  const { result, error } = tryDecryptObj<T>(encrypted, secretKey, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

export * from "./kit-encode.js";
export * from "./kit-hash.js";
export * from "./kit-hmac.js";
export * from "./kit-random.js";
