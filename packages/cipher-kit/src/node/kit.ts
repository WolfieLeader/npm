import type { Buffer } from "node:buffer";
import { $fmtResultErr, type Result } from "~/helpers/error";
import type {
  CreateSecretKeyOptions,
  DecryptOptions,
  Encoding,
  EncryptOptions,
  HashOptions,
  HashPasswordOptions,
  SecretKey,
  VerifyPasswordOptions,
} from "~/helpers/types";
import { $isSecretKey } from "~/helpers/validate";
import { $convertBytesToStr, $convertEncoding, $convertStrToBytes } from "./node-encode";
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
} from "./node-encrypt";

/**
 * Type guard to check if the provided value is a SecretKey object for Node.js environment.
 *
 * ### 🍼 Explain Like I'm Five
 * Checking if the key in your hand is the right kind of key for the lock.
 *
 * @param x - The value to check.
 * @returns True if the value is a SecretKey object for Node.js, false otherwise.
 */
export function isNodeSecretKey(x: unknown): x is SecretKey<"node"> {
  return $isSecretKey(x, "node") !== null;
}

/**
 * Safely generates a UUID (v4) (non-throwing).
 *
 * ### 🍼 Explain Like I'm Five
 * It's like giving your pet a name tag with a super random name made of numbers and letters.
 * The chance of two pets getting the same name tag is practically zero, and it's very hard to guess!
 *
 * @returns A `Result` containing the UUID string or an error.
 */
export function tryGenerateUuid(): Result<string> {
  return $generateUuid();
}

/**
 * Generates a UUID (v4) (throwing).
 *
 * ### 🍼 Explain Like I'm Five
 * It's like giving your pet a name tag with a super random name made of numbers and letters.
 * The chance of two pets getting the same name tag is practically zero, and it's very hard to guess!
 *
 * @returns A UUID string.
 * @throws {Error} If UUID generation fails.
 */
export function generateUuid(): string {
  const { result, error } = $generateUuid();
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Safely derives a `SecretKey` from the provided string for encryption/decryption (non-throwing).
 *
 * Uses HKDF to derive a key from the input string.
 *
 * ### 🍼 Explain Like I'm Five
 * Imagine you want to create a special key for future use to lock your treasure box (data).
 * So, you stir in some secret ingredients (like salt and info) to make sure your key is one-of-a-kind.
 *
 * @param secret - The input string to derive the `SecretKey` from, must be at least 8 characters.
 * @param options.algorithm - The encryption algorithm to use (default: `'aes256gcm'`).
 * @param options.digest - The hash algorithm for HKDF (default: `'sha256'`).
 * @param options.salt - A salt string (default: `'cipher-kit-salt'`, must be ≥ 8 chars).
 * @param options.info - An info string (default: `'cipher-kit'`).
 * @returns A `Result` containing the derived `SecretKey` or an error.
 */
export function tryCreateSecretKey(
  secret: string,
  options: CreateSecretKeyOptions = {},
): Result<{ result: SecretKey<"node"> }> {
  return $createSecretKey(secret, options);
}

/**
 * Derives a `SecretKey` from the provided string for encryption/decryption (throwing).
 *
 * Uses HKDF to derive a key from the input string.
 *
 * ### 🍼 Explain Like I'm Five
 * Imagine you want to create a special key for future use to lock your treasure box (data).
 * So, you stir in some secret ingredients (like salt and info) to make sure your key is one-of-a-kind.
 *
 * @param secret - The input string to derive the `SecretKey` from, must be at least 8 characters.
 * @param options.algorithm - The encryption algorithm to use (default: `'aes256gcm'`).
 * @param options.digest - The hash algorithm for HKDF (default: `'sha256'`).
 * @param options.salt - A salt string (default: `'cipher-kit-salt'`, must be ≥ 8 chars).
 * @param options.info - An info string (default: `'cipher-kit'`).
 * @returns The derived `SecretKey`.
 * @throws {Error} If key derivation fails.
 */
export function createSecretKey(secret: string, options: CreateSecretKeyOptions = {}): SecretKey<"node"> {
  const { result, error } = $createSecretKey(secret, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Safely encrypts a UTF-8 string using the provided `SecretKey` (non-throwing).
 *
 * Output format: "iv.cipher.tag."
 *
 * ### 🍼 Explain Like I'm Five
 * You scramble a secret message with your special key,
 * creating a jumbled code that only someone with the right key can read.
 *
 * @param data - A UTF-8 string to encrypt.
 * @param secretKey - The `SecretKey` object used for encryption.
 * @param options.encoding - The encoding format for the output ciphertext (default: `'base64url'`).
 * @returns A `Result` containing the encrypted string in the specified format or an error.
 */
export function tryEncrypt(data: string, secretKey: SecretKey<"node">, options: EncryptOptions = {}): Result<string> {
  return $encrypt(data, secretKey, options);
}

/**
 * Encrypts a UTF-8 string using the provided `SecretKey` (throwing).
 *
 * Output format: "iv.cipher.tag."
 *
 * ### 🍼 Explain Like I'm Five
 * You scramble a secret message with your special key,
 * creating a jumbled code that only someone with the right key can read.
 *
 * @param data - A UTF-8 string to encrypt.
 * @param secretKey - The `SecretKey` object used for encryption.
 * @param options.encoding - The encoding format for the output ciphertext (default: `'base64url'`).
 * @returns The encrypted string in the specified format.
 * @throws {Error} If the input data or key is invalid, or if encryption fails.
 */
export function encrypt(data: string, secretKey: SecretKey<"node">, options: EncryptOptions = {}): string {
  const { result, error } = $encrypt(data, secretKey, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Safely decrypts the input string using the provided `SecretKey` (non-throwing).
 *
 * Expects input in the format "iv.cipher.tag." and returns the decrypted UTF-8 string.
 *
 * ### 🍼 Explain Like I'm Five
 * You take a scrambled secret message and use your special key to unscramble it,
 * revealing the original message inside.
 *
 * @param encrypted - The input string to decrypt, in the format "iv.cipher.tag.".
 * @param secretKey - The `SecretKey` object used for decryption.
 * @param options.encoding - The encoding format for the input ciphertext (default: `'base64url'`).
 * @returns A `Result` containing the decrypted UTF-8 string or an error.
 */
export function tryDecrypt(
  encrypted: string,
  secretKey: SecretKey<"node">,
  options: DecryptOptions = {},
): Result<string> {
  return $decrypt(encrypted, secretKey, options);
}

/**
 * Decrypts the input string using the provided `SecretKey` (throwing).
 *
 * Expects input in the format "iv.cipher.tag." and returns the decrypted UTF-8 string.
 *
 * ### 🍼 Explain Like I'm Five
 * You take a scrambled secret message and use your special key to unscramble it,
 * revealing the original message inside.
 *
 * @param encrypted - The input string to decrypt, in the format "iv.cipher.tag.".
 * @param secretKey - The `SecretKey` object used for decryption.
 * @param options.encoding - The encoding format for the input ciphertext (default: `'base64url'`).
 * @returns The decrypted UTF-8 string.
 * @throws {Error} If the input data or key is invalid, or if decryption fails.
 */
export function decrypt(encrypted: string, secretKey: SecretKey<"node">, options: DecryptOptions = {}): string {
  const { result, error } = $decrypt(encrypted, secretKey, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Safely encrypts a plain object using the provided `SecretKey` (non-throwing).
 *
 * Only plain objects (POJOs) are accepted. Class instances, Maps, Sets, etc. are rejected.
 *
 * Output format: "iv.cipher.tag."
 *
 * ### 🍼 Explain Like I'm Five
 * Imagine you have a toy box (an object) that you want to keep secret.
 * So, you take a picture of your toy box (convert it to JSON), and scramble that with
 * your special key, creating a jumbled code that only someone with the right key can read.
 *
 * @param data - A plain object to encrypt.
 * @param secretKey - The `SecretKey` object used for encryption.
 * @param options.encoding - The encoding format for the output ciphertext (default: `'base64url'`).
 * @returns A `Result` containing the encrypted string in the specified format or an error.
 */
export function tryEncryptObj<T extends object = Record<string, unknown>>(
  data: T,
  secretKey: SecretKey<"node">,
  options: EncryptOptions = {},
): Result<string> {
  return $encryptObj(data, secretKey, options);
}

/**
 * Encrypts a plain object using the provided `SecretKey` (throwing).
 *
 * Only plain objects (POJOs) are accepted. Class instances, Maps, Sets, etc. are rejected.
 *
 * Output format: "iv.cipher.tag."
 *
 * ### 🍼 Explain Like I'm Five
 * Imagine you have a toy box (an object) that you want to keep secret.
 * So, you take a picture of your toy box (convert it to JSON), and scramble that with
 * your special key, creating a jumbled code that only someone with the right key can read.
 *
 * @param data - A plain object to encrypt.
 * @param secretKey - The `SecretKey` object used for encryption.
 * @param options.encoding - The encoding format for the output ciphertext (default: `'base64url'`).
 * @returns The encrypted string in the specified format.
 * @throws {Error} If the input data or key is invalid, or if encryption fails.
 */
export function encryptObj<T extends object = Record<string, unknown>>(
  data: T,
  secretKey: SecretKey<"node">,
  options: EncryptOptions = {},
): string {
  const { result, error } = $encryptObj(data, secretKey, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Safely decrypts an encrypted JSON string into an object (non-throwing).
 *
 * Expects input in the format `"iv.cipher.tag."` and returns a plain object.
 *
 * ### 🍼 Explain Like I'm Five
 * You rebuild your toy box (an object) by unscrambling the jumbled code (encrypted text),
 * using your special key to open it.
 *
 * @template T - The expected shape of the decrypted object.
 * @param encrypted - The encrypted string (format: `"iv.cipher.tag."`).
 * @param secretKey - The `SecretKey` used for decryption.
 * @param options.encoding - Input ciphertext encoding (default: `'base64url'`).
 * @returns A `Result` with the decrypted object on success, or an error.
 */
export function tryDecryptObj<T extends object = Record<string, unknown>>(
  encrypted: string,
  secretKey: SecretKey<"node">,
  options: DecryptOptions = {},
): Result<{ result: T }> {
  return $decryptObj<T>(encrypted, secretKey, options);
}

/**
 * Decrypts an encrypted JSON string into an object (throwing).
 *
 * Expects input in the format `"iv.cipher.tag."` and returns a plain object.
 *
 * ### 🍼 Explain Like I'm Five
 * You rebuild your toy box (an object) by unscrambling the jumbled code (encrypted text),
 * using your special key to open it.
 *
 * @template T - The expected shape of the decrypted object.
 * @param encrypted - The encrypted string (format: `"iv.cipher.tag."`).
 * @param secretKey - The `SecretKey` used for decryption.
 * @param options.encoding - Input ciphertext encoding (default: `'base64url'`).
 * @returns The decrypted object.
 * @throws {Error} If decryption or JSON parsing fails.
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
 * Safely hashes a UTF-8 string (non-throwing).
 *
 * Uses the selected digest (default: `'sha256'`) and returns the hash
 * in the chosen encoding (default: `'base64url'`).
 *
 * ### 🍼 Explain Like I'm Five
 * Like putting something in a blender and getting a smoothie, you can’t get the original ingredients back,
 * but the smoothie is always the same if you use the same ingredients.
 *
 * @param data - The input string to hash.
 * @param options.digest - Hash algorithm (`'sha256' | 'sha384' | 'sha512'`, default: `'sha256'`).
 * @param options.encoding - Output encoding (`'base64' | 'base64url' | 'hex'`, default: `'base64url'`).
 * @returns A `Result` with the hash string or an error.
 */
export function tryHash(data: string, options: HashOptions = {}): Result<string> {
  return $hash(data, options);
}

/**
 * Hashes a UTF-8 string (throwing).
 *
 * Uses the selected digest (default: `'sha256'`) and returns the hash
 * in the chosen encoding (default: `'base64url'`).
 *
 * ### 🍼 Explain Like I'm Five
 * Like putting something in a blender and getting a smoothie, you can’t get the original ingredients back,
 * but the smoothie is always the same if you use the same ingredients.
 *
 * @param data - The input string to hash.
 * @param options.digest - Hash algorithm (`'sha256' | 'sha384' | 'sha512'`; default: `'sha256'`).
 * @param options.encoding - Output encoding (`'base64' | 'base64url' | 'hex'`; default: `'base64url'`).
 * @returns The hashed string.
 * @throws {Error} If input is invalid or hashing fails.
 */
export function hash(data: string, options: HashOptions = {}): string {
  const { result, error } = $hash(data, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Safely hashes a password using PBKDF2 (non-throwing).
 *
 * Uses strong defaults (`sha512`, 320k iterations, 64-byte key, 16-byte salt) and
 * returns `{ hash, salt }` encoded (default: `'base64url'`).
 *
 * ### 🍼 Explain Like I'm Five
 * We take your password, mix in some random salt, and stir many times.
 * The result is a super-secret soup that’s hard to copy.
 *
 * @param password - The password to hash.
 * @param options.digest - Hash algorithm (`'sha256' | 'sha384' | 'sha512'`; default: `'sha512'`).
 * @param options.encoding - Output encoding (`'base64' | 'base64url' | 'hex'`; default: `'base64url'`).
 * @param options.saltLength - Length of the random salt in bytes (default: `16` bytes, min: `8` bytes).
 * @param options.iterations - Number of iterations (default: `320000`, min: `1000`).
 * @param options.keyLength - Length of the derived key in bytes (default: `64` bytes, min: `16` bytes).
 * @returns A `Result` with `{ hash, salt }` or an error.
 */
export function tryHashPassword(
  password: string,
  options: HashPasswordOptions = {},
): Result<{ hash: string; salt: string }> {
  return $hashPassword(password, options);
}

/**
 * Hashes a password using PBKDF2 (throwing).
 *
 * Uses strong defaults (`sha512`, 320k iterations, 64-byte key, 16-byte salt) and
 * returns `{ hash, salt }` encoded (default: `'base64url'`).
 *
 * ### 🍼 Explain Like I'm Five
 * We take your password, mix in some random salt, and stir many times.
 * The result is a super-secret soup that’s hard to copy.
 *
 * @param password - The password to hash.
 * @param options.digest - Hash algorithm (`'sha256' | 'sha384' | 'sha512'`; default: `'sha512'`).
 * @param options.encoding - Output encoding (`'base64' | 'base64url' | 'hex'`; default: `'base64url'`).
 * @param options.saltLength - Length of the random salt in bytes (default: `16` bytes, min: `8` bytes).
 * @param options.iterations - Number of iterations (default: `320000`, min: `1000`).
 * @param options.keyLength - Length of the derived key in bytes (default: `64` bytes, min: `16` bytes).
 * @returns `{ hash, salt }` for storage.
 * @throws {Error} If inputs are invalid or hashing fails.
 */
export function hashPassword(password: string, options: HashPasswordOptions = {}): { hash: string; salt: string } {
  const { hash, salt, error } = $hashPassword(password, options);
  if (error) throw new Error($fmtResultErr(error));
  return { hash, salt };
}

/**
 * Verifies a password against a stored PBKDF2 hash (non-throwing).
 *
 * Re-derives the key using the same parameters and compares in constant time, to prevent timing attacks.
 *
 * ### 🍼 Explain Like I'm Five
 * We follow the same recipe as when we made the secret.
 * If the new soup tastes exactly the same, the password is correct.
 *
 * @param password - The plain password to verify.
 * @param hashedPassword - The stored hash (encoded).
 * @param salt - The stored salt (encoded).
 * @param options.digest - Hash algorithm used during hashing (`'sha256' | 'sha384' | 'sha512'`; default: `'sha512'`).
 * @param options.encoding - Encoding of the stored hash and salt (`'base64' | 'base64url' | 'hex'`; default: `'base64url'`).
 * @param options.iterations - Number of iterations used during hashing (default: `320000`).
 * @param options.keyLength - Length of the derived key in bytes used during hashing (default: `64` bytes).
 * @returns `true` if the password matches, otherwise `false`.
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
 * Safely converts a string to a Node.js `Buffer` using the specified encoding (non-throwing).
 *
 * Supported encodings: `'base64' | 'base64url' | 'hex' | 'utf8' | 'latin1'` (default: `'utf8'`).
 *
 * ### 🍼 Explain Like I'm Five
 * This turns your words into tiny computer building blocks (bytes) so computers can work with them.
 *
 * @param data - The input string to convert.
 * @param inputEncoding - The encoding of the input string (default: `'utf8'`).
 * @returns A `Result` with `{ result: Buffer }` or an error.
 */
export function tryConvertStrToBytes(data: string, inputEncoding: Encoding = "utf8"): Result<{ result: Buffer }> {
  return $convertStrToBytes(data, inputEncoding);
}

/**
 * Converts a string to a Node.js `Buffer` using the specified encoding (throwing).
 *
 * Supported encodings: `'base64' | 'base64url' | 'hex' | 'utf8' | 'latin1'` (default: `'utf8'`).
 *
 * ### 🍼 Explain Like I'm Five
 * This turns your words into tiny computer building blocks (bytes) so computers can work with them.
 *
 * @param data - The input string to convert.
 * @param inputEncoding - The encoding of the input string (default: `'utf8'`).
 * @returns A `Buffer` containing the bytes.
 * @throws {Error} If input is invalid or conversion fails.
 */
export function convertStrToBytes(data: string, inputEncoding: Encoding = "utf8"): Buffer {
  const { result, error } = $convertStrToBytes(data, inputEncoding);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Safely converts a Node.js `Buffer` to a string using the specified encoding (non-throwing).
 *
 * Supported encodings: `'base64' | 'base64url' | 'hex' | 'utf8' | 'latin1'` (default: `'utf8'`).
 *
 * ### 🍼 Explain Like I'm Five
 * This turns the tiny computer building blocks (bytes) back into a readable sentence.
 *
 * @param data - The `Buffer` to convert.
 * @param outputEncoding - The output encoding (default: `'utf8'`).
 * @returns A `Result` with the string or an error.
 */
export function tryConvertBytesToStr(data: Buffer, outputEncoding: Encoding = "utf8"): Result<string> {
  return $convertBytesToStr(data, outputEncoding);
}

/**
 * Converts a Node.js `Buffer` to a string using the specified encoding (throwing).
 *
 * Supported encodings: `'base64' | 'base64url' | 'hex' | 'utf8' | 'latin1'` (default: `'utf8'`).
 *
 * ### 🍼 Explain Like I'm Five
 * This turns the tiny computer building blocks (bytes) back into a readable sentence.
 *
 * @param data - The `Buffer` to convert.
 * @param outputEncoding - The output encoding (default: `'utf8'`).
 * @returns The encoded string.
 * @throws {Error} If input is invalid or conversion fails.
 */
export function convertBytesToStr(data: Buffer, outputEncoding: Encoding = "utf8"): string {
  const { result, error } = $convertBytesToStr(data, outputEncoding);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Safely converts text between encodings (non-throwing).
 *
 * Example: convert `'utf8'` text to `'base64url'`, or `'hex'` to `'utf8'`.
 *
 * ### 🍼 Explain Like I'm Five
 * It’s like translating your sentence from one alphabet to another.
 *
 * @param data - The input string to convert.
 * @param from - The current encoding of `data`.
 * @param to - The target encoding for `data`.
 * @returns A `Result` with a string or an error.
 */
export function tryConvertEncoding(data: string, from: Encoding, to: Encoding): Result<string> {
  return $convertEncoding(data, from, to);
}

/**
 * Converts text between encodings (throwing).
 *
 * Example: convert `'utf8'` text to `'base64url'`, or `'hex'` to `'utf8'`.
 *
 * ### 🍼 Explain Like I'm Five
 * It’s like translating your sentence from one alphabet to another.
 *
 * @param data - The input string to convert.
 * @param from - The current encoding of `data`.
 * @param to - The target encoding for `data`.
 * @returns The converted string.
 * @throws {Error} If encodings are invalid or conversion fails.
 */
export function convertEncoding(data: string, from: Encoding, to: Encoding): string {
  const { result, error } = $convertEncoding(data, from, to);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}
