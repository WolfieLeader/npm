import type { Buffer } from "node:buffer";
import { $fmtResultErr, type Result } from "~/helpers/error.js";
import type {
  CreateSecretKeyOptions,
  DecryptOptions,
  Encoding,
  EncryptOptions,
  HashOptions,
  HashPasswordOptions,
  SecretKey,
  VerifyPasswordOptions,
} from "~/helpers/types.js";
import { $isSecretKey } from "~/helpers/validate.js";
import { $convertBytesToStr, $convertEncoding, $convertStrToBytes } from "./node-encode.js";
import {
  $createSecretKey,
  $decrypt,
  $decryptObj,
  $encrypt,
  $encryptObj,
  $generateUuid,
  $hash,
  $hashPassword,
  $verifyPassword,
} from "./node-encrypt.js";

/**
 * Checks whether a value is a `SecretKey` for the Node.js platform.
 *
 * @param x - The value to check.
 * @returns `true` if `x` is a `SecretKey<"node">`.
 *
 * @example
 * ```ts
 * isNodeSecretKey(nodeKey); // true
 * isNodeSecretKey({});      // false
 * ```
 */
export function isNodeSecretKey(x: unknown): x is SecretKey<"node"> {
  return $isSecretKey(x, "node") !== null;
}

/**
 * Generates a UUID (v4) (non-throwing).
 *
 * @returns `Result<string>` with the UUID or error.
 * @see {@link generateUuid} For full parameter/behavior docs.
 */
export function tryGenerateUuid(): Result<string> {
  return $generateUuid();
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
  const { result, error } = $generateUuid();
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Derives a `SecretKey` from a passphrase (non-throwing).
 *
 * @returns `Result<{ result: SecretKey<"node"> }>` with the derived key or error.
 * @see {@link createSecretKey} For full parameter/behavior docs.
 */
export function tryCreateSecretKey(
  secret: string,
  options: CreateSecretKeyOptions = {},
): Result<{ result: SecretKey<"node"> }> {
  return $createSecretKey(secret, options);
}

/**
 * Derives a `SecretKey` from a passphrase for encryption/decryption.
 *
 * @remarks
 * Uses HKDF to derive a symmetric key from the input string.
 *
 * @param secret - Passphrase to derive the key from (min 8 characters).
 * @param options - Key derivation options.
 * @returns The derived `SecretKey`.
 * @throws {Error} If key derivation fails.
 *
 * @example
 * ```ts
 * const secretKey = createSecretKey("my-secret");
 * ```
 *
 * @see {@link tryCreateSecretKey} Non-throwing variant returning `Result`.
 */
export function createSecretKey(secret: string, options: CreateSecretKeyOptions = {}): SecretKey<"node"> {
  const { result, error } = $createSecretKey(secret, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Encrypts a UTF-8 string (non-throwing).
 *
 * @returns `Result<string>` with the ciphertext or error.
 * @see {@link encrypt} For full parameter/behavior docs.
 */
export function tryEncrypt(data: string, secretKey: SecretKey<"node">, options: EncryptOptions = {}): Result<string> {
  return $encrypt(data, secretKey, options);
}

/**
 * Encrypts a UTF-8 string using the provided `SecretKey`.
 *
 * @remarks
 * Output format: `"iv.cipher.tag."` (three dot-separated base64url segments plus trailing dot).
 *
 * @param data - UTF-8 string to encrypt.
 * @param secretKey - The `SecretKey` used for encryption.
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
export function encrypt(data: string, secretKey: SecretKey<"node">, options: EncryptOptions = {}): string {
  const { result, error } = $encrypt(data, secretKey, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Decrypts a ciphertext string (non-throwing).
 *
 * @returns `Result<string>` with the plaintext or error.
 * @see {@link decrypt} For full parameter/behavior docs.
 */
export function tryDecrypt(
  encrypted: string,
  secretKey: SecretKey<"node">,
  options: DecryptOptions = {},
): Result<string> {
  return $decrypt(encrypted, secretKey, options);
}

/**
 * Decrypts a ciphertext string using the provided `SecretKey`.
 *
 * @remarks
 * Expects input in the format `"iv.cipher.tag."`.
 *
 * @param encrypted - The encrypted string to decrypt.
 * @param secretKey - The `SecretKey` used for decryption.
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
export function decrypt(encrypted: string, secretKey: SecretKey<"node">, options: DecryptOptions = {}): string {
  const { result, error } = $decrypt(encrypted, secretKey, options);
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
  secretKey: SecretKey<"node">,
  options: EncryptOptions = {},
): Result<string> {
  return $encryptObj(obj, secretKey, options);
}

/**
 * Encrypts a plain object using the provided `SecretKey`.
 *
 * @remarks
 * Only plain objects (POJOs) are accepted; class instances, Maps, Sets, etc. are rejected.
 * Output format: `"iv.cipher.tag."`.
 *
 * @param obj - Plain object to encrypt.
 * @param secretKey - The `SecretKey` used for encryption.
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
  secretKey: SecretKey<"node">,
  options: EncryptOptions = {},
): string {
  const { result, error } = $encryptObj(obj, secretKey, options);
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
  secretKey: SecretKey<"node">,
  options: DecryptOptions = {},
): Result<{ result: T }> {
  return $decryptObj<T>(encrypted, secretKey, options);
}

/**
 * Decrypts an encrypted JSON string into a plain object.
 *
 * @remarks
 * Expects input in the format `"iv.cipher.tag."`.
 *
 * @param encrypted - The encrypted string.
 * @param secretKey - The `SecretKey` used for decryption.
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
  secretKey: SecretKey<"node">,
  options: DecryptOptions = {},
): T {
  const { result, error } = $decryptObj<T>(encrypted, secretKey, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Hashes a UTF-8 string (non-throwing).
 *
 * @returns `Result<string>` with the hash or error.
 * @see {@link hash} For full parameter/behavior docs.
 */
export function tryHash(data: string, options: HashOptions = {}): Result<string> {
  return $hash(data, options);
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
 * const hashed = hash("my data");
 * ```
 *
 * @see {@link tryHash} Non-throwing variant returning `Result<string>`.
 */
export function hash(data: string, options: HashOptions = {}): string {
  const { result, error } = $hash(data, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Hashes a password using PBKDF2 (non-throwing).
 *
 * @returns `Result<{ result: string; salt: string }>` with the hash/salt or error.
 * @see {@link hashPassword} For full parameter/behavior docs.
 */
export function tryHashPassword(
  password: string,
  options: HashPasswordOptions = {},
): Result<{ result: string; salt: string }> {
  return $hashPassword(password, options);
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
 * const { result, salt } = hashPassword("my-password");
 * ```
 *
 * @see {@link tryHashPassword} Non-throwing variant returning `Result`.
 */
export function hashPassword(password: string, options: HashPasswordOptions = {}): { result: string; salt: string } {
  const { result, salt, error } = $hashPassword(password, options);
  if (error) throw new Error($fmtResultErr(error));
  return { result, salt };
}

/**
 * Verifies a password against a stored PBKDF2 hash.
 *
 * @remarks
 * Re-derives the key with the same parameters and compares in constant time to prevent timing attacks.
 *
 * @param password - The plain password to verify.
 * @param hashedPassword - The stored hash (encoded).
 * @param salt - The stored salt (encoded).
 * @param options - Verification options (must match the parameters used to hash).
 * @returns `true` if the password matches, otherwise `false`.
 *
 * @example
 * ```ts
 * const { result, salt } = hashPassword("my-password");
 * verifyPassword("my-password", result, salt);    // true
 * verifyPassword("wrong-password", result, salt); // false
 * ```
 */
export function verifyPassword(
  password: string,
  hashedPassword: string,
  salt: string,
  options: VerifyPasswordOptions = {},
): boolean {
  return $verifyPassword(password, hashedPassword, salt, options);
}

/**
 * Converts a string to a `Buffer` (non-throwing).
 *
 * @returns `Result<{ result: Buffer }>` with the buffer or error.
 * @see {@link convertStrToBytes} For full parameter/behavior docs.
 */
export function tryConvertStrToBytes(data: string, inputEncoding: Encoding = "utf8"): Result<{ result: Buffer }> {
  return $convertStrToBytes(data, inputEncoding);
}

/**
 * Converts a string to a Node.js `Buffer` using the specified encoding.
 *
 * @param data - The input string to convert.
 * @param inputEncoding - Source encoding (default: `'utf8'`).
 * @returns A `Buffer` containing the bytes.
 * @throws {Error} If input is invalid or conversion fails.
 *
 * @example
 * ```ts
 * const bytes = convertStrToBytes("Hello", "utf8");
 * ```
 *
 * @see {@link tryConvertStrToBytes} Non-throwing variant returning `Result`.
 */
export function convertStrToBytes(data: string, inputEncoding: Encoding = "utf8"): Buffer {
  const { result, error } = $convertStrToBytes(data, inputEncoding);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Converts a `Buffer` to a string (non-throwing).
 *
 * @returns `Result<string>` with the encoded string or error.
 * @see {@link convertBytesToStr} For full parameter/behavior docs.
 */
export function tryConvertBytesToStr(data: Buffer, outputEncoding: Encoding = "utf8"): Result<string> {
  return $convertBytesToStr(data, outputEncoding);
}

/**
 * Converts a Node.js `Buffer` to a string using the specified encoding.
 *
 * @param data - The `Buffer` to convert.
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
export function convertBytesToStr(data: Buffer, outputEncoding: Encoding = "utf8"): string {
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
