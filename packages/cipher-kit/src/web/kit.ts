import type { DIGEST_ALGORITHMS, ENCRYPTION_ALGORITHMS } from '~/helpers/consts';
import { $fmtResultErr, type Result } from '~/helpers/error';
import type { EncodingFormat, SecretKey } from '~/helpers/types';
import { $convertBytesToStr, $convertFormat, $convertStrToBytes } from './web-encode';
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
} from './web-encrypt';

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
export async function tryCreateSecretKey(
  secret: string,
  options: {
    algorithm?: keyof typeof ENCRYPTION_ALGORITHMS;
    digest?: keyof typeof DIGEST_ALGORITHMS;
    salt?: string;
    info?: string;
  } = {},
): Promise<Result<{ result: SecretKey<'web'> }>> {
  return await $createSecretKey(secret, options);
}

/**
 * Derives a secret key from the provided string for encryption/decryption.
 * Internally, the key is hashed using SHA-256 to ensure it meets the required length.
 *
 * @param secret - The input string to derive the secret key from.
 * @returns A SecretKey object representing the derived secret key.
 * @throws {Error} If the input key is invalid or key generation fails.
 */
export async function createSecretKey(
  secret: string,
  options: {
    algorithm?: keyof typeof ENCRYPTION_ALGORITHMS;
    digest?: keyof typeof DIGEST_ALGORITHMS;
    salt?: string;
    info?: string;
  } = {},
): Promise<SecretKey<'web'>> {
  const { result, error } = await $createSecretKey(secret, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Encrypts the input string using the provided secret key.
 * The output is a string in the format "iv.cipherWithTag." where each component is base64url encoded.
 *
 * @param data - The input string to encrypt.
 * @param secretKey - The SecretKey object used for encryption.
 * @returns A Result containing a string representing the encrypted data in the specified format or an error.
 */
export async function tryEncrypt(data: string, secretKey: SecretKey<'web'>): Promise<Result<string>> {
  return await $encrypt(data, secretKey);
}

/**
 * Encrypts the input string using the provided secret key.
 * The output is a string in the format "iv.cipherWithTag." where each component is base64url encoded.
 *
 * @param data - The input string to encrypt.
 * @param secretKey - The SecretKey object used for encryption.
 * @returns A string representing the encrypted data in the specified format.
 * @throws {Error} If the input data or key is invalid, or if encryption fails.
 */
export async function encrypt(data: string, secretKey: SecretKey<'web'>): Promise<string> {
  const { result, error } = await $encrypt(data, secretKey);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Decrypts the input string using the provided secret key.
 * The input must be in the format "iv.cipherWithTag." where each component is base64url encoded.
 *
 * @param encrypted - The input string to decrypt.
 * @param secretKey - The SecretKey object used for decryption.
 * @returns A Result containing a string representing the decrypted data or an error.
 */
export async function tryDecrypt(encrypted: string, secretKey: SecretKey<'web'>): Promise<Result<string>> {
  return await $decrypt(encrypted, secretKey);
}

/**
 * Decrypts the input string using the provided secret key.
 * The input must be in the format "iv.cipherWithTag" where each component is base64url encoded.
 *
 * @param encrypted - The input string to decrypt.
 * @param secretKey - The SecretKey object used for decryption.
 * @returns A string representing the decrypted data.
 * @throws {Error} If the input data or key is invalid, or if decryption fails.
 */
export async function decrypt(encrypted: string, secretKey: SecretKey<'web'>): Promise<string> {
  const { result, error } = await $decrypt(encrypted, secretKey);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Encrypts the input object using the provided secret key.
 * The object is first serialized to a JSON string before encryption.
 * The output is a string in the format "iv.cipherWithTag." where each component is base64url encoded.
 *
 * @param data - The input object to encrypt.
 * @param secretKey - The SecretKey object used for encryption.
 * @returns A Result containing a string representing the encrypted object in the specified format or an error.
 */
export async function tryEncryptObj<T extends object = Record<string, unknown>>(
  data: T,
  secretKey: SecretKey<'web'>,
): Promise<Result<string>> {
  return await $encryptObj(data, secretKey);
}

/**
 * Encrypts the input object using the provided secret key.
 * The object is first serialized to a JSON string before encryption.
 * The output is a string in the format "iv.cipherWithTag." where each component is base64url encoded.
 *
 * @param data - The input object to encrypt.
 * @param secretKey - The SecretKey object used for encryption.
 * @returns A string representing the encrypted object in the specified format.
 * @throws {Error} If the input data or key is invalid, or if encryption fails.
 */
export async function encryptObj<T extends object = Record<string, unknown>>(
  data: T,
  secretKey: SecretKey<'web'>,
): Promise<string> {
  const { result, error } = await $encryptObj(data, secretKey);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Decrypts the input string to an object using the provided secret key.
 * The input must be in the format "iv.cipherWithTag." where each component is base64url encoded.
 * The decrypted string is parsed as JSON to reconstruct the original object.
 *
 * @param encrypted - The input string to decrypt.
 * @param secretKey - The SecretKey object used for decryption.
 * @returns A Result containing an object representing the decrypted data or an error.
 */
export async function tryDecryptObj<T extends object = Record<string, unknown>>(
  encrypted: string,
  secretKey: SecretKey<'web'>,
): Promise<Result<{ result: T }>> {
  return await $decryptObj<T>(encrypted, secretKey);
}

/**
 * Decrypts the input string to an object using the provided secret key.
 * The input must be in the format "iv.cipherWithTag." where each component is base64url encoded.
 * The decrypted string is parsed as JSON to reconstruct the original object.
 *
 * @param encrypted - The input string to decrypt.
 * @param secretKey - The SecretKey object used for decryption.
 * @returns An object representing the decrypted data.
 * @throws {Error} If the input data or key is invalid, or if decryption fails.
 */
export async function decryptObj<T extends object = Record<string, unknown>>(
  encrypted: string,
  secretKey: SecretKey<'web'>,
): Promise<{ result: T }> {
  const { result, error } = await $decryptObj<T>(encrypted, secretKey);
  if (error) throw new Error($fmtResultErr(error));
  return { result };
}

/**
 * Hashes the input string using SHA-256 and returns the hash in base64url format.
 *
 * @param data - The input string to hash.
 * @returns A Result containing a string representing the SHA-256 hash in base64url format or an error.
 */
export async function tryHash(data: string): Promise<Result<string>> {
  return await $hash(data);
}

/**
 * Hashes the input string using SHA-256 and returns the hash in base64url format.
 *
 * @param data - The input string to hash.
 * @returns A string representing the SHA-256 hash in base64url format.
 * @throws {Error} If the input data is invalid or hashing fails.
 */
export async function hash(data: string): Promise<string> {
  const { result, error } = await $hash(data);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Hashes a password using PBKDF2 with SHA-512.
 *
 * @param password - The password to hash.
 * @returns A Result containing an object with the hash and salt, or an error.
 */
export async function tryHashPassword(password: string): Promise<Result<{ hash: string; salt: string }>> {
  return await $hashPassword(password);
}

/**
 * Hashes a password using PBKDF2 with SHA-512.
 *
 * @param password - The password to hash.
 * @returns An object with the hash and salt.
 * @throws {Error} If the input password is invalid or hashing fails.
 */
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const { hash, salt, error } = await $hashPassword(password);
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
export async function verifyPassword(password: string, hashedPassword: string, salt: string): Promise<boolean> {
  return await $verifyPassword(password, hashedPassword, salt);
}

/**
 * Converts a string to a Buffer (byte array) using the specified encoding format.
 * Supported formats: 'base64', 'base64url', 'hex', 'utf8', 'latin1'.
 *
 * @param data - The input string to convert.
 * @param format - The encoding format to use (default is 'utf8').
 * @returns A Result containing a Uint8Array with the encoded data or an error.
 */
export function tryConvertStrToBytes(
  data: string,
  format: EncodingFormat = 'utf8',
): Result<{ result: Uint8Array<ArrayBuffer> }> {
  return $convertStrToBytes(data, format);
}

/**
 * Converts a string to a Buffer (byte array) using the specified encoding format.
 * Supported formats: 'base64', 'base64url', 'hex', 'utf8', 'latin1'.
 *
 * @param data - The input string to convert.
 * @param format - The encoding format to use (default is 'utf8').
 * @returns A Uint8Array containing the encoded data.
 * @throws {Error} If the input data is invalid or conversion fails.
 */
export function convertStrToBytes(data: string, format: EncodingFormat = 'utf8'): Uint8Array<ArrayBuffer> {
  const { result, error } = $convertStrToBytes(data, format);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Converts a Uint8Array or ArrayBuffer (byte array) to a string using the specified encoding format.
 * Supported formats: 'base64', 'base64url', 'hex', 'utf8', 'latin1'.
 *
 * @param data - The input Uint8Array or ArrayBuffer to convert.
 * @param format - The encoding format to use (default is 'utf8').
 * @returns A Result containing the string representation of the Uint8Array or an error.
 */
export function tryConvertBytesToStr(data: Uint8Array | ArrayBuffer, format: EncodingFormat = 'utf8'): Result<string> {
  return $convertBytesToStr(data, format);
}

/**
 * Converts a Uint8Array or ArrayBuffer (byte array) to a string using the specified encoding format.
 * Supported formats: 'base64', 'base64url', 'hex', 'utf8', 'latin1'.
 *
 * @param data - The input Uint8Array or ArrayBuffer to convert.
 * @param format - The encoding format to use (default is 'utf8').
 * @returns A string representation of the Uint8Array in the specified format.
 * @throws {Error} If the input data is invalid or conversion fails.
 */
export function convertBytesToStr(data: Uint8Array | ArrayBuffer, format: EncodingFormat = 'utf8'): string {
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
