import { $fmtResultErr } from "@internal/helpers";
import type { Result } from "@internal/helpers";
import { $guardAsync } from "~/helpers/guard.js";
import type { CreateSecretKeyOptions, DecryptOptions, EncryptOptions } from "~/helpers/types.js";
import { $decrypt, $decryptObj, $encrypt, $encryptObj } from "./web-encrypt.js";
import { $createSecretKey, $isWebSecretKey } from "./web-secret-key.js";
import type { WebSecretKey } from "./web-secret-key.js";

/**
 * Checks whether a value is a `WebSecretKey` for the Web Crypto platform.
 *
 * @param x - The value to check.
 * @returns `true` if `x` is a `WebSecretKey`.
 *
 * @example
 * ```ts
 * isWebSecretKey(webKey); // true
 * isWebSecretKey({});     // false
 * ```
 */
export function isWebSecretKey(x: unknown): x is WebSecretKey {
  return $isWebSecretKey(x) !== null;
}

/**
 * Derives a `WebSecretKey` from a high-entropy secret (non-throwing).
 *
 * @returns `Promise<Result<{ result: WebSecretKey }>>` with the derived key or error.
 * @see {@link createSecretKey} For full parameter/behavior docs.
 */
export async function tryCreateSecretKey(
  secret: string,
  options: CreateSecretKeyOptions = {},
): Promise<Result<{ result: WebSecretKey }>> {
  return $guardAsync("web createSecretKey", () => $createSecretKey(secret, options));
}

/**
 * Derives a `WebSecretKey` from a high-entropy secret for encryption/decryption.
 *
 * @remarks
 * Uses HKDF via the Web Crypto API to derive a symmetric key from the input string.
 *
 * @param secret - High-entropy secret (min 8 chars). For human-chosen passwords, use {@link hashPassword} instead.
 * @param options - Key derivation options.
 * @returns The derived `WebSecretKey`.
 * @throws {Error} If key derivation fails.
 *
 * @example
 * ```ts
 * const secretKey = await createSecretKey("my-32-char-high-entropy-secret!!");
 * ```
 *
 * @see {@link tryCreateSecretKey} Non-throwing variant returning `Result`.
 */
export async function createSecretKey(secret: string, options: CreateSecretKeyOptions = {}): Promise<WebSecretKey> {
  const { result, error } = await tryCreateSecretKey(secret, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Encrypts a UTF-8 string (non-throwing).
 *
 * @returns `Promise<Result<string>>` with the ciphertext or error.
 * @see {@link encrypt} For full parameter/behavior docs.
 */
export async function tryEncrypt(
  data: string,
  secretKey: WebSecretKey,
  options: EncryptOptions = {},
): Promise<Result<string>> {
  return $guardAsync("web encrypt", () => $encrypt(data, secretKey, options));
}

/**
 * Encrypts a UTF-8 string using the provided `WebSecretKey`.
 *
 * @remarks
 * Output format: `"iv.cipher.tag."` (three dot-separated base64url segments plus trailing dot).
 * Cross-platform compatible — data encrypted on Web can be decrypted on Node and vice versa.
 * AES-GCM uses random 96-bit IVs. Rotate keys before ~2^32 encryptions with the same key to avoid nonce collision.
 *
 * @param data - UTF-8 string to encrypt. Any non-empty, well-formed string is accepted, including whitespace-only
 *   strings. Empty strings and strings with lone UTF-16 surrogates are rejected.
 * @param secretKey - The `WebSecretKey` used for encryption.
 * @param options - Encryption options.
 * @returns The encrypted string.
 * @throws {Error} If the input or key is invalid, or encryption fails.
 *
 * @example
 * ```ts
 * const secretKey = await createSecretKey("my-secret");
 * const encrypted = await encrypt("Hello, World!", secretKey);
 * ```
 *
 * @see {@link tryEncrypt} Non-throwing variant returning `Result<string>`.
 */
export async function encrypt(data: string, secretKey: WebSecretKey, options: EncryptOptions = {}): Promise<string> {
  const { result, error } = await tryEncrypt(data, secretKey, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Decrypts a ciphertext string (non-throwing).
 *
 * @returns `Promise<Result<string>>` with the plaintext or error.
 * @see {@link decrypt} For full parameter/behavior docs.
 */
export async function tryDecrypt(
  encrypted: string,
  secretKey: WebSecretKey,
  options: DecryptOptions = {},
): Promise<Result<string>> {
  return $guardAsync("web decrypt", () => $decrypt(encrypted, secretKey, options));
}

/**
 * Decrypts a ciphertext string using the provided `WebSecretKey`.
 *
 * @remarks
 * Expects input in the format `"iv.cipher.tag."`.
 * Cross-platform compatible — data encrypted on Node can be decrypted on Web and vice versa.
 *
 * @param encrypted - The encrypted string to decrypt.
 * @param secretKey - The `WebSecretKey` used for decryption.
 * @param options - Decryption options.
 * @returns The decrypted UTF-8 string.
 * @throws {Error} If the input or key is invalid, or decryption fails.
 *
 * @example
 * ```ts
 * const secretKey = await createSecretKey("my-secret");
 * const encrypted = await encrypt("Hello, World!", secretKey);
 * const decrypted = await decrypt(encrypted, secretKey); // "Hello, World!"
 * ```
 *
 * @see {@link tryDecrypt} Non-throwing variant returning `Result<string>`.
 */
export async function decrypt(
  encrypted: string,
  secretKey: WebSecretKey,
  options: DecryptOptions = {},
): Promise<string> {
  const { result, error } = await tryDecrypt(encrypted, secretKey, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Encrypts a plain object (non-throwing).
 *
 * @returns `Promise<Result<string>>` with the ciphertext or error.
 * @see {@link encryptObj} For full parameter/behavior docs.
 */
export async function tryEncryptObj<T extends object = Record<string, unknown>>(
  obj: T,
  secretKey: WebSecretKey,
  options: EncryptOptions = {},
): Promise<Result<string>> {
  return $guardAsync("web encryptObj", () => $encryptObj(obj, secretKey, options));
}

/**
 * Encrypts a plain object using the provided `WebSecretKey`.
 *
 * @remarks
 * Only plain objects (POJOs) are accepted; class instances, Maps, Sets, etc. are rejected.
 * Output format: `"iv.cipher.tag."`.
 *
 * @param obj - Plain object to encrypt.
 * @param secretKey - The `WebSecretKey` used for encryption.
 * @param options - Encryption options.
 * @returns The encrypted string.
 * @throws {Error} If the input or key is invalid, or encryption fails.
 *
 * @example
 * ```ts
 * const secretKey = await createSecretKey("my-secret");
 * const encrypted = await encryptObj({ a: 1 }, secretKey);
 * ```
 *
 * @see {@link tryEncryptObj} Non-throwing variant returning `Result<string>`.
 */
export async function encryptObj<T extends object = Record<string, unknown>>(
  obj: T,
  secretKey: WebSecretKey,
  options: EncryptOptions = {},
): Promise<string> {
  const { result, error } = await tryEncryptObj(obj, secretKey, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Decrypts an encrypted JSON string into a plain object (non-throwing).
 *
 * @returns `Promise<Result<{ result: T }>>` with the object or error.
 * @see {@link decryptObj} For full parameter/behavior docs.
 */
export async function tryDecryptObj<T extends object = Record<string, unknown>>(
  encrypted: string,
  secretKey: WebSecretKey,
  options: DecryptOptions = {},
): Promise<Result<{ result: T }>> {
  return $guardAsync("web decryptObj", () => $decryptObj<T>(encrypted, secretKey, options));
}

/**
 * Decrypts an encrypted JSON string into a plain object.
 *
 * @remarks
 * Expects input in the format `"iv.cipher.tag."`.
 *
 * @param encrypted - The encrypted string.
 * @param secretKey - The `WebSecretKey` used for decryption.
 * @param options - Decryption options.
 * @returns The decrypted object.
 * @throws {Error} If decryption or JSON parsing fails.
 *
 * @example
 * ```ts
 * const secretKey = await createSecretKey("my-secret");
 * const encrypted = await encryptObj({ a: 1 }, secretKey);
 * const obj = await decryptObj<{ a: number }>(encrypted, secretKey); // obj.a === 1
 * ```
 *
 * @see {@link tryDecryptObj} Non-throwing variant returning `Result`.
 */
export async function decryptObj<T extends object = Record<string, unknown>>(
  encrypted: string,
  secretKey: WebSecretKey,
  options: DecryptOptions = {},
): Promise<T> {
  const { result, error } = await tryDecryptObj<T>(encrypted, secretKey, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

export * from "./kit-encode.js";
export * from "./kit-hash.js";
export * from "./kit-hmac.js";
export * from "./kit-random.js";
