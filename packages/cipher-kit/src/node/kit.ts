import type { Buffer } from 'node:buffer';
import { $fmtResultErr, type Result } from '~/helpers/error';
import type { EncodingFormat, NodeKey } from '~/helpers/types';
import { $convertBytesToStr, $convertFormat, $convertStrToBytes } from './node-encode';
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
} from './node-encrypt';

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
 * @param key - The input string to derive the secret key from.
 * @returns A Result containing a NodeKey object representing the derived secret key or an error.
 */
export function tryCreateSecretKey(key: string): Result<{ result: NodeKey }> {
  return $createSecretKey(key);
}

/**
 * Derives a secret key from the provided string for encryption/decryption.
 * Internally, the key is hashed using SHA-256 to ensure it meets the required length.
 *
 * @param key - The input string to derive the secret key from.
 * @returns A NodeKey object representing the derived secret key.
 * @throws {Error} If the input key is invalid or key generation fails.
 */
export function createSecretKey(key: string): NodeKey {
  const { result, error } = $createSecretKey(key);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Encrypts the input string using the provided secret key.
 * The output is a string in the format "iv.cipher.tag." where each component is base64url encoded.
 *
 * @param data - The input string to encrypt.
 * @param secretKey - The NodeKey object used for encryption.
 * @returns A Result containing a string representing the encrypted data in the specified format or an error.
 */
export function tryEncrypt(data: string, secretKey: NodeKey): Result<string> {
  return $encrypt(data, secretKey);
}

/**
 * Encrypts the input string using the provided secret key.
 * The output is a string in the format "iv.cipher.tag." where each component is base64url encoded.
 *
 * @param data - The input string to encrypt.
 * @param secretKey - The NodeKey object used for encryption.
 * @returns A string representing the encrypted data in the specified format.
 * @throws {Error} If the input data or key is invalid, or if encryption fails.
 */
export function encrypt(data: string, secretKey: NodeKey): string {
  const { result, error } = $encrypt(data, secretKey);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Decrypts the input string using the provided secret key.
 * The input must be in the format "iv.cipher.tag." where each component is base64url encoded.
 *
 * @param encrypted - The input string to decrypt.
 * @param secretKey - The NodeKey object used for decryption.
 * @returns A Result containing a string representing the decrypted data or an error.
 */
export function tryDecrypt(encrypted: string, secretKey: NodeKey): Result<string> {
  return $decrypt(encrypted, secretKey);
}

/**
 * Decrypts the input string using the provided secret key.
 * The input must be in the format "iv.cipher.tag." where each component is base64url encoded.
 *
 * @param encrypted - The input string to decrypt.
 * @param secretKey - The NodeKey object used for decryption.
 * @returns A string representing the decrypted data.
 * @throws {Error} If the input data or key is invalid, or if decryption fails.
 */
export function decrypt(encrypted: string, secretKey: NodeKey): string {
  const { result, error } = $decrypt(encrypted, secretKey);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Encrypts the input object using the provided secret key.
 * The object is first serialized to a JSON string before encryption.
 * The output is a string in the format "iv.cipher.tag." where each component is base64url encoded.
 *
 * @param data - The input object to encrypt.
 * @param secretKey - The NodeKey object used for encryption.
 * @returns A Result containing a string representing the encrypted object in the specified format or an error.
 */
export function tryEncryptObj<T extends object = Record<string, unknown>>(data: T, secretKey: NodeKey): Result<string> {
  return $encryptObj(data, secretKey);
}

/**
 * Encrypts the input object using the provided secret key.
 * The object is first serialized to a JSON string before encryption.
 * The output is a string in the format "iv.cipher.tag." where each component is base64url encoded.
 *
 * @param data - The input object to encrypt.
 * @param secretKey - The NodeKey object used for encryption.
 * @returns A string representing the encrypted object in the specified format.
 * @throws {Error} If the input data or key is invalid, or if encryption fails.
 */
export function encryptObj<T extends object = Record<string, unknown>>(data: T, secretKey: NodeKey): string {
  const { result, error } = $encryptObj(data, secretKey);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Decrypts the input string to an object using the provided secret key.
 * The input must be in the format "iv.cipher.tag." where each component is base64url encoded.
 * The decrypted string is parsed as JSON to reconstruct the original object.
 *
 * @param encrypted - The input string to decrypt.
 * @param secretKey - The NodeKey object used for decryption.
 * @returns A Result containing an object representing the decrypted data or an error.
 */
export function tryDecryptObj<T extends object = Record<string, unknown>>(
  encrypted: string,
  secretKey: NodeKey,
): Result<{ result: T }> {
  return $decryptObj<T>(encrypted, secretKey);
}

/**
 * Decrypts the input string to an object using the provided secret key.
 * The input must be in the format "iv.cipher.tag." where each component is base64url encoded.
 * The decrypted string is parsed as JSON to reconstruct the original object.
 *
 * @param encrypted - The input string to decrypt.
 * @param secretKey - The NodeKey object used for decryption.
 * @returns An object representing the decrypted data.
 * @throws {Error} If the input data or key is invalid, or if decryption fails.
 */
export function decryptObj<T extends object = Record<string, unknown>>(
  encrypted: string,
  secretKey: NodeKey,
): { result: T } {
  const { result, error } = $decryptObj<T>(encrypted, secretKey);
  if (error) throw new Error($fmtResultErr(error));
  return { result };
}

/**
 * Hashes the input string using SHA-256 and returns the hash in base64url format.
 *
 * @param data - The input string to hash.
 * @returns A Result containing a string representing the SHA-256 hash in base64url format or an error.
 */
export function tryHash(data: string): Result<string> {
  return $hash(data);
}

/**
 * Hashes the input string using SHA-256 and returns the hash in base64url format.
 *
 * @param data - The input string to hash.
 * @returns A string representing the SHA-256 hash in base64url format.
 * @throws {Error} If the input data is invalid or hashing fails.
 */
export function hash(data: string): string {
  const { result, error } = $hash(data);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Hashes a password using PBKDF2 with SHA-512.
 *
 * @param password - The password to hash.
 * @returns A Result containing an object with the hash and salt, or an error.
 */
export function tryHashPassword(password: string): Result<{ hash: string; salt: string }> {
  return $hashPassword(password);
}

/**
 * Hashes a password using PBKDF2 with SHA-512.
 *
 * @param password - The password to hash.
 * @returns An object with the hash and salt.
 * @throws {Error} If the input password is invalid or hashing fails.
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const { hash, salt, error } = $hashPassword(password);
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
export function verifyPassword(password: string, hashedPassword: string, salt: string): boolean {
  return $verifyPassword(password, hashedPassword, salt);
}

/**
 * Converts a string to a Buffer (byte array) using the specified encoding format.
 * Supported formats: 'base64', 'base64url', 'hex', 'utf8', 'latin1'.
 *
 * @param data - The input string to convert.
 * @param format - The encoding format to use (default is 'utf8').
 * @returns A Result containing a Node.js Buffer with the encoded data or an error.
 */
export function tryConvertStrToBytes(data: string, format: EncodingFormat = 'utf8'): Result<{ result: Buffer }> {
  return $convertStrToBytes(data, format);
}

/**
 * Converts a string to a Buffer (byte array) using the specified encoding format.
 * Supported formats: 'base64', 'base64url', 'hex', 'utf8', 'latin1'.
 *
 * @param data - The input string to convert.
 * @param format - The encoding format to use (default is 'utf8').
 * @returns A Node.js Buffer containing the encoded data.
 * @throws {Error} If the input data is invalid or conversion fails.
 */
export function convertStrToBytes(data: string, format: EncodingFormat = 'utf8'): Buffer {
  const { result, error } = $convertStrToBytes(data, format);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Converts a Buffer (byte array) to a string using the specified encoding format.
 * Supported formats: 'base64', 'base64url', 'hex', 'utf8', 'latin1'.
 *
 * @param data - The input Buffer to convert.
 * @param format - The encoding format to use (default is 'utf8').
 * @returns A Result containing the string representation of the Buffer or an error.
 */
export function tryConvertBytesToStr(data: Buffer, format: EncodingFormat = 'utf8'): Result<string> {
  return $convertBytesToStr(data, format);
}

/**
 * Converts a Buffer (byte array) to a string using the specified encoding format.
 * Supported formats: 'base64', 'base64url', 'hex', 'utf8', 'latin1'.
 *
 * @param data - The input Buffer to convert.
 * @param format - The encoding format to use (default is 'utf8').
 * @returns A string representation of the Buffer in the specified format.
 * @throws {Error} If the input data is invalid or conversion fails.
 */
export function convertBytesToStr(data: Buffer, format: EncodingFormat = 'utf8'): string {
  const { result, error } = $convertBytesToStr(data, format);
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
export function tryConvertFormat(data: string, from: EncodingFormat, to: EncodingFormat): Result<{ result: string }> {
  return $convertFormat(data, from, to);
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
export function convertFormat(data: string, from: EncodingFormat, to: EncodingFormat): string {
  const { result, error } = $convertFormat(data, from, to);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}
