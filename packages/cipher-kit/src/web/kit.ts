import { $err, $fmtError, $fmtResultErr, $ok, type Result } from "@internal/helpers";
import type {
  CreateSecretKeyOptions,
  DecryptOptions,
  Encoding,
  EncryptOptions,
  HashOptions,
  HashPasswordOptions,
  VerifyPasswordOptions,
} from "~/helpers/types.js";
import { $convertBytesToStr, $convertEncoding, $convertStrToBytes } from "./web-encode.js";
import { $decrypt, $decryptObj, $encrypt, $encryptObj } from "./web-encrypt.js";
import { $hash, $hashPassword, $verifyPassword } from "./web-hash.js";
import { $createSecretKey, $isWebSecretKey, type WebSecretKey } from "./web-secret-key.js";

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
 * Generates a UUID (v4) (non-throwing).
 *
 * @returns `Result<string>` with the UUID or error.
 * @see {@link generateUuid} For full parameter/behavior docs.
 */
export function tryGenerateUuid(): Result<string> {
  try {
    return $ok(globalThis.crypto.randomUUID());
  } catch (error) {
    return $err({ message: "web generateUuid: Failed to generate UUID", description: $fmtError(error) });
  }
}

/**
 * Generates a cryptographically random UUID (v4).
 *
 * @returns A UUID string.
 * @throws {Error} If UUID generation fails.
 *
 * @example
 * ```ts
 * const uuid = generateUuid();
 * ```
 *
 * @see {@link tryGenerateUuid} Non-throwing variant returning `Result<string>`.
 */
export function generateUuid(): string {
  return globalThis.crypto.randomUUID();
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
  return await $createSecretKey(secret, options);
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
  const { result, error } = await $createSecretKey(secret, options);
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
  return await $encrypt(data, secretKey, options);
}

/**
 * Encrypts a UTF-8 string using the provided `WebSecretKey`.
 *
 * @remarks
 * Output format: `"iv.cipher.tag."` (three dot-separated base64url segments plus trailing dot).
 * Cross-platform compatible — data encrypted on Web can be decrypted on Node and vice versa.
 *
 * @param data - UTF-8 string to encrypt. Must be a non-empty string (whitespace-only strings are rejected).
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
  const { result, error } = await $encrypt(data, secretKey, options);
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
  return await $decrypt(encrypted, secretKey, options);
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
  const { result, error } = await $decrypt(encrypted, secretKey, options);
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
  return await $encryptObj(obj, secretKey, options);
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
  const { result, error } = await $encryptObj(obj, secretKey, options);
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
  return await $decryptObj<T>(encrypted, secretKey, options);
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
  const { result, error } = await $decryptObj<T>(encrypted, secretKey, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Hashes a UTF-8 string (non-throwing).
 *
 * @returns `Promise<Result<string>>` with the hash or error.
 * @see {@link hash} For full parameter/behavior docs.
 */
export async function tryHash(data: string, options: HashOptions = {}): Promise<Result<string>> {
  return await $hash(data, options);
}

/**
 * Hashes a UTF-8 string using the specified digest algorithm.
 *
 * @param data - The input string to hash.
 * @param options - Hash options.
 * @returns The hashed string.
 * @throws {Error} If input is invalid or hashing fails.
 *
 * @example
 * ```ts
 * const hashed = await hash("my data");
 * ```
 *
 * @see {@link tryHash} Non-throwing variant returning `Result<string>`.
 */
export async function hash(data: string, options: HashOptions = {}): Promise<string> {
  const { result, error } = await $hash(data, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Hashes a password using PBKDF2 (non-throwing).
 *
 * @returns `Promise<Result<{ result: string; salt: string }>>` with the hash/salt or error.
 * @see {@link hashPassword} For full parameter/behavior docs.
 */
export async function tryHashPassword(
  password: string,
  options: HashPasswordOptions = {},
): Promise<Result<{ result: string; salt: string }>> {
  return await $hashPassword(password, options);
}

/**
 * Hashes a password using PBKDF2.
 *
 * @remarks
 * Defaults: `sha512`, 320 000 iterations, 64-byte key, 16-byte random salt.
 *
 * @param password - The password to hash.
 * @param options - Password hashing options.
 * @returns `{ result, salt }` for storage.
 * @throws {Error} If inputs are invalid or hashing fails.
 *
 * @example
 * ```ts
 * const { result, salt } = await hashPassword("my-password");
 * ```
 *
 * @see {@link tryHashPassword} Non-throwing variant returning `Result`.
 */
export async function hashPassword(
  password: string,
  options: HashPasswordOptions = {},
): Promise<{ result: string; salt: string }> {
  const { result, salt, error } = await $hashPassword(password, options);
  if (error) throw new Error($fmtResultErr(error));
  return { result, salt };
}

/**
 * Verifies a password against a stored PBKDF2 hash (non-throwing).
 *
 * @returns `Promise<Result<boolean>>` — `true` if the password matches, `false` if not, or an error for invalid inputs/options.
 * @see {@link verifyPassword} For full parameter/behavior docs.
 */
export async function tryVerifyPassword(
  password: string,
  hashedPassword: string,
  salt: string,
  options: VerifyPasswordOptions = {},
): Promise<Result<boolean>> {
  return await $verifyPassword(password, hashedPassword, salt, options);
}

/**
 * Verifies a password against a stored PBKDF2 hash.
 *
 * @remarks
 * Re-derives the key with the same parameters and compares using a full-loop XOR pattern.
 * This is best-effort constant-time; JS JIT optimization may introduce timing variation.
 * The Web Crypto API does not expose a `timingSafeEqual` equivalent.
 * For timing-critical deployments, prefer the Node implementation which uses `crypto.timingSafeEqual`.
 * Throws for invalid inputs/options (bad encoding, wrong parameters, non-decodable salt/hash).
 * Returns `false` for password mismatch or length-mismatched hash.
 *
 * @param password - The plain password to verify.
 * @param hashedPassword - The stored hash (encoded).
 * @param salt - The stored salt (encoded).
 * @param options - Verification options (must match the parameters used to hash).
 * @returns `true` if the password matches, otherwise `false`.
 * @throws {Error} If verification input/options are invalid.
 *
 * @example
 * ```ts
 * const { result, salt } = await hashPassword("my-password");
 * await verifyPassword("my-password", result, salt);    // true
 * await verifyPassword("wrong-password", result, salt); // false
 * ```
 *
 * @see {@link tryVerifyPassword} Non-throwing variant returning `Result<boolean>`.
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string,
  salt: string,
  options: VerifyPasswordOptions = {},
): Promise<boolean> {
  const { result, error } = await $verifyPassword(password, hashedPassword, salt, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Converts a string to a `Uint8Array` (non-throwing).
 *
 * @returns `Result<{ result: Uint8Array<ArrayBuffer> }>` with the bytes or error.
 * @see {@link convertStrToBytes} For full parameter/behavior docs.
 */
export function tryConvertStrToBytes(
  data: string,
  inputEncoding: Encoding = "utf8",
): Result<{ result: Uint8Array<ArrayBuffer> }> {
  return $convertStrToBytes(data, inputEncoding);
}

/**
 * Converts a string to a `Uint8Array` using the specified encoding.
 *
 * @param data - The input string to convert.
 * @param inputEncoding - Source encoding (default: `'utf8'`).
 * @returns A `Uint8Array` containing the bytes.
 * @throws {Error} If input is invalid or conversion fails.
 *
 * @example
 * ```ts
 * const bytes = convertStrToBytes("Hello", "utf8");
 * ```
 *
 * @see {@link tryConvertStrToBytes} Non-throwing variant returning `Result`.
 */
export function convertStrToBytes(data: string, inputEncoding: Encoding = "utf8"): Uint8Array<ArrayBuffer> {
  const { result, error } = $convertStrToBytes(data, inputEncoding);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Converts a `Uint8Array` or `ArrayBuffer` to a string (non-throwing).
 *
 * @returns `Result<string>` with the encoded string or error.
 * @see {@link convertBytesToStr} For full parameter/behavior docs.
 */
export function tryConvertBytesToStr(
  data: Uint8Array | ArrayBuffer,
  outputEncoding: Encoding = "utf8",
): Result<string> {
  return $convertBytesToStr(data, outputEncoding);
}

/**
 * Converts a `Uint8Array` or `ArrayBuffer` to a string using the specified encoding.
 *
 * @param data - The bytes to convert.
 * @param outputEncoding - Target encoding (default: `'utf8'`).
 * @returns The encoded string.
 * @throws {Error} If input is invalid or conversion fails.
 *
 * @example
 * ```ts
 * const bytes = convertStrToBytes("Hello", "utf8");
 * const str = convertBytesToStr(bytes, "utf8"); // "Hello"
 * ```
 *
 * @see {@link tryConvertBytesToStr} Non-throwing variant returning `Result<string>`.
 */
export function convertBytesToStr(data: Uint8Array | ArrayBuffer, outputEncoding: Encoding = "utf8"): string {
  const { result, error } = $convertBytesToStr(data, outputEncoding);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Converts text between encodings (non-throwing).
 *
 * @returns `Result<string>` with the re-encoded string or error.
 * @see {@link convertEncoding} For full parameter/behavior docs.
 */
export function tryConvertEncoding(data: string, from: Encoding, to: Encoding): Result<string> {
  return $convertEncoding(data, from, to);
}

/**
 * Converts text between encodings.
 *
 * @param data - The input string.
 * @param from - Current encoding of `data`.
 * @param to - Target encoding.
 * @returns The re-encoded string.
 * @throws {Error} If encodings are invalid or conversion fails.
 *
 * @example
 * ```ts
 * const encoded = convertEncoding("Hello", "utf8", "base64url");
 * ```
 *
 * @see {@link tryConvertEncoding} Non-throwing variant returning `Result<string>`.
 */
export function convertEncoding(data: string, from: Encoding, to: Encoding): string {
  const { result, error } = $convertEncoding(data, from, to);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}
