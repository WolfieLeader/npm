import type { Buffer } from 'node:buffer';
import { $fmtResultErr, type Result } from '~/helpers/error';
import type {
  CreateSecretKeyOptions,
  DecryptOptions,
  Encoding,
  EncryptOptions,
  HashOptions,
  HashPasswordOptions,
  SecretKey,
  VerifyPasswordOptions,
} from '~/helpers/types';
import { $isSecretKey } from '~/helpers/validate';
import { $convertBytesToStr, $convertEncoding, $convertStrToBytes } from './node-encode';
import {
  $createSecretKey,
  $decrypt,
  $decryptObj,
  $encrypt,
  $encryptObj,
  $generateUuid,
  $hash,
  $hashObj,
  $hashPassword,
  $verifyPassword,
} from './node-encrypt';

export function isNodeSecretKey(x: unknown): x is SecretKey<'node'> {
  return $isSecretKey(x, 'node') !== null;
}

/**
 * Generates a UUID (v4).
 *
 * @returns A Result containing a string representing the generated UUID or an error.
 */
export function tryGenerateUuid(): Result<string> {
  return $generateUuid();
}

/**
 * Generates a UUID (v4).
 *
 * @returns A string representing the generated UUID.
 * @throws {Error} If UUID generation fails.
 */
export function generateUuid(): string {
  const { result, error } = $generateUuid();
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Derives a secret key from the provided string for encryption/decryption.
 * Internally, the key is hashed using SHA-256 to ensure it meets the required length.
 *
 * @param secret - The input string to derive the secret key from.
 * @returns A Result containing a SecretKey object representing the derived secret key or an error.
 */
export function tryCreateSecretKey(
  secret: string,
  options: CreateSecretKeyOptions = {},
): Result<{ result: SecretKey<'node'> }> {
  return $createSecretKey(secret, options);
}

/**
 * Derives a secret key from the provided string for encryption/decryption.
 * Internally, the key is hashed using SHA-256 to ensure it meets the required length.
 *
 * @param secret - The input string to derive the secret key from.
 * @returns A SecretKey object representing the derived secret key.
 * @throws {Error} If the input key is invalid or key generation fails.
 */
export function createSecretKey(secret: string, options: CreateSecretKeyOptions = {}): SecretKey<'node'> {
  const { result, error } = $createSecretKey(secret, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Encrypts the input string using the provided secret key.
 * The output is a string in the format "iv.cipher.tag." where each component is base64url encoded.
 *
 * @param data - The input string to encrypt.
 * @param secretKey - The SecretKey object used for encryption.
 * @returns A Result containing a string representing the encrypted data in the specified format or an error.
 */
export function tryEncrypt(data: string, secretKey: SecretKey<'node'>, options: EncryptOptions = {}): Result<string> {
  return $encrypt(data, secretKey, options);
}

/**
 * Encrypts the input string using the provided secret key.
 * The output is a string in the format "iv.cipher.tag." where each component is base64url encoded.
 *
 * @param data - The input string to encrypt.
 * @param secretKey - The SecretKey object used for encryption.
 * @returns A string representing the encrypted data in the specified format.
 * @throws {Error} If the input data or key is invalid, or if encryption fails.
 */
export function encrypt(data: string, secretKey: SecretKey<'node'>, options: EncryptOptions = {}): string {
  const { result, error } = $encrypt(data, secretKey, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Decrypts the input string using the provided secret key.
 * The input must be in the format "iv.cipher.tag." where each component is base64url encoded.
 *
 * @param encrypted - The input string to decrypt.
 * @param secretKey - The SecretKey object used for decryption.
 * @returns A Result containing a string representing the decrypted data or an error.
 */
export function tryDecrypt(
  encrypted: string,
  secretKey: SecretKey<'node'>,
  options: DecryptOptions = {},
): Result<string> {
  return $decrypt(encrypted, secretKey, options);
}

/**
 * Decrypts the input string using the provided secret key.
 * The input must be in the format "iv.cipher.tag." where each component is base64url encoded.
 *
 * @param encrypted - The input string to decrypt.
 * @param secretKey - The SecretKey object used for decryption.
 * @returns A string representing the decrypted data.
 * @throws {Error} If the input data or key is invalid, or if decryption fails.
 */
export function decrypt(encrypted: string, secretKey: SecretKey<'node'>, options: DecryptOptions = {}): string {
  const { result, error } = $decrypt(encrypted, secretKey, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Encrypts the input object using the provided secret key.
 * The object is first serialized to a JSON string before encryption.
 * The output is a string in the format "iv.cipher.tag." where each component is base64url encoded.
 *
 * @param data - The input object to encrypt.
 * @param secretKey - The SecretKey object used for encryption.
 * @returns A Result containing a string representing the encrypted object in the specified format or an error.
 */
export function tryEncryptObj<T extends object = Record<string, unknown>>(
  data: T,
  secretKey: SecretKey<'node'>,
  options: EncryptOptions = {},
): Result<string> {
  return $encryptObj(data, secretKey, options);
}

/**
 * Encrypts the input object using the provided secret key.
 * The object is first serialized to a JSON string before encryption.
 * The output is a string in the format "iv.cipher.tag." where each component is base64url encoded.
 *
 * @param data - The input object to encrypt.
 * @param secretKey - The SecretKey object used for encryption.
 * @returns A string representing the encrypted object in the specified format.
 * @throws {Error} If the input data or key is invalid, or if encryption fails.
 */
export function encryptObj<T extends object = Record<string, unknown>>(
  data: T,
  secretKey: SecretKey<'node'>,
  options: EncryptOptions = {},
): string {
  const { result, error } = $encryptObj(data, secretKey, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Decrypts the input string to an object using the provided secret key.
 * The input must be in the format "iv.cipher.tag." where each component is base64url encoded.
 * The decrypted string is parsed as JSON to reconstruct the original object.
 *
 * @param encrypted - The input string to decrypt.
 * @param secretKey - The SecretKey object used for decryption.
 * @returns A Result containing an object representing the decrypted data or an error.
 */
export function tryDecryptObj<T extends object = Record<string, unknown>>(
  encrypted: string,
  secretKey: SecretKey<'node'>,
  options: DecryptOptions = {},
): Result<{ result: T }> {
  return $decryptObj<T>(encrypted, secretKey, options);
}

/**
 * Decrypts the input string to an object using the provided secret key.
 * The input must be in the format "iv.cipher.tag." where each component is base64url encoded.
 * The decrypted string is parsed as JSON to reconstruct the original object.
 *
 * @param encrypted - The input string to decrypt.
 * @param secretKey - The SecretKey object used for decryption.
 * @returns An object representing the decrypted data.
 * @throws {Error} If the input data or key is invalid, or if decryption fails.
 */
export function decryptObj<T extends object = Record<string, unknown>>(
  encrypted: string,
  secretKey: SecretKey<'node'>,
  options: DecryptOptions = {},
): T {
  const { result, error } = $decryptObj<T>(encrypted, secretKey, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Hashes the input string using SHA-256 and returns the hash in base64url format.
 *
 * @param data - The input string to hash.
 * @returns A Result containing a string representing the SHA-256 hash in base64url format or an error.
 */
export function tryHash(data: string, options: HashOptions = {}): Result<string> {
  return $hash(data, options);
}

/**
 * Hashes the input string using SHA-256 and returns the hash in base64url format.
 *
 * @param data - The input string to hash.
 * @returns A string representing the SHA-256 hash in base64url format.
 * @throws {Error} If the input data is invalid or hashing fails.
 */
export function hash(data: string, options: HashOptions = {}): string {
  const { result, error } = $hash(data, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Hashes the input object by first serializing it to a JSON string using stable key ordering,
 * then hashing the string using SHA-256 and returning the hash in base64url format.
 *
 * @param data - The input object to hash.
 * @returns A Result containing a string representing the SHA-256 hash of the serialized object in base64url format or an error.
 * */
export function tryHashObj<T extends object = Record<string, unknown>>(
  data: T,
  options: HashOptions = {},
): Result<string> {
  return $hashObj(data, options);
}

/**
 * Hashes the input object by first serializing it to a JSON string using stable key ordering,
 * then hashing the string using SHA-256 and returning the hash in base64url format.
 *
 * @param data - The input object to hash.
 * @returns A string representing the SHA-256 hash of the serialized object in base64url format.
 * @throws {Error} If the input data is invalid or hashing fails.
 */
export function hashObj<T extends object = Record<string, unknown>>(data: T, options: HashOptions = {}): string {
  const { result, error } = $hashObj(data, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Hashes a password using PBKDF2 with SHA-512.
 *
 * @param password - The password to hash.
 * @returns A Result containing an object with the hash and salt, or an error.
 */
export function tryHashPassword(
  password: string,
  options: HashPasswordOptions = {},
): Result<{ hash: string; salt: string }> {
  return $hashPassword(password, options);
}

/**
 * Hashes a password using PBKDF2 with SHA-512.
 *
 * @param password - The password to hash.
 * @returns An object with the hash and salt.
 * @throws {Error} If the input password is invalid or hashing fails.
 */
export function hashPassword(password: string, options: HashPasswordOptions = {}): { hash: string; salt: string } {
  const { hash, salt, error } = $hashPassword(password, options);
  if (error) throw new Error($fmtResultErr(error));
  return { hash, salt };
}

/**
 * Verifies a password against a hashed password and salt.
 *
 * @param password - The password to verify.
 * @param hashedPassword - The hashed password to compare against (in base64url format).
 * @param salt - The salt used during hashing (in base64url format).
 * @returns A boolean indicating whether the password matches the hashed password.
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
 * Converts a string to a Buffer (byte array) using the specified encoding format.
 * Supported formats: 'base64', 'base64url', 'hex', 'utf8', 'latin1'.
 *
 * @param data - The input string to convert.
 * @param inputEncoding - The encoding format to use (default is 'utf8').
 * @returns A Result containing a Node.js Buffer with the encoded data or an error.
 */
export function tryConvertStrToBytes(data: string, inputEncoding: Encoding = 'utf8'): Result<{ result: Buffer }> {
  return $convertStrToBytes(data, inputEncoding);
}

/**
 * Converts a string to a Buffer (byte array) using the specified encoding format.
 * Supported formats: 'base64', 'base64url', 'hex', 'utf8', 'latin1'.
 *
 * @param data - The input string to convert.
 * @param inputEncoding - The encoding format to use (default is 'utf8').
 * @returns A Node.js Buffer containing the encoded data.
 * @throws {Error} If the input data is invalid or conversion fails.
 */
export function convertStrToBytes(data: string, inputEncoding: Encoding = 'utf8'): Buffer {
  const { result, error } = $convertStrToBytes(data, inputEncoding);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Converts a Buffer (byte array) to a string using the specified encoding format.
 * Supported formats: 'base64', 'base64url', 'hex', 'utf8', 'latin1'.
 *
 * @param data - The input Buffer to convert.
 * @param outputEncoding - The encoding format to use (default is 'utf8').
 * @returns A Result containing the string representation of the Buffer or an error.
 */
export function tryConvertBytesToStr(data: Buffer, outputEncoding: Encoding = 'utf8'): Result<string> {
  return $convertBytesToStr(data, outputEncoding);
}

/**
 * Converts a Buffer (byte array) to a string using the specified encoding format.
 * Supported formats: 'base64', 'base64url', 'hex', 'utf8', 'latin1'.
 *
 * @param data - The input Buffer to convert.
 * @param outputEncoding - The encoding format to use (default is 'utf8').
 * @returns A string representation of the Buffer in the specified format.
 * @throws {Error} If the input data is invalid or conversion fails.
 */
export function convertBytesToStr(data: Buffer, outputEncoding: Encoding = 'utf8'): string {
  const { result, error } = $convertBytesToStr(data, outputEncoding);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Convert data from one encoding format to another.
 *
 * @param data - The input data to convert.
 * @param from - The encoding format to convert from.
 * @param to - The encoding format to convert to.
 * @returns A Result containing the converted string or an error.
 */
export function tryConvertEncoding(data: string, from: Encoding, to: Encoding): Result<{ result: string }> {
  return $convertEncoding(data, from, to);
}

/**
 * Convert data from one encoding format to another.
 *
 * @param data - The input data to convert.
 * @param from - The encoding format to convert from.
 * @param to - The encoding format to convert to.
 * @returns A converted string.
 * @throws {Error} If the input data is invalid or conversion fails.
 */
export function convertEncoding(data: string, from: Encoding, to: Encoding): string {
  const { result, error } = $convertEncoding(data, from, to);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}
