import { Buffer } from 'node:buffer';
import nodeCrypto from 'node:crypto';
import { $err, $fmtError, $fmtResultErr, $ok, type Result } from '~/error';
import type { NodeKey } from '~/types';
import { $isStr, CONFIG, isInNodeEncryptedFormat, isNodeKey, tryParseToObj, tryStringifyObj } from '~/utils';
import { tryBytesToString, tryStringToBytes } from './node-encode';

/**
 * Generates a UUID (v4).
 *
 * @returns A Result containing a string representing the generated UUID or an error.
 */
export function tryGenerateUuid(): Result<string> {
  try {
    return $ok(nodeCrypto.randomUUID());
  } catch (error) {
    return $err({ msg: 'Crypto NodeJS API - UUID Generation: Failed to generate UUID', desc: $fmtError(error) });
  }
}

/**
 * Derives a secret key from the provided string for encryption/decryption.
 * Internally, the key is hashed using SHA-256 to ensure it meets the required length.
 *
 * @param key - The input string to derive the secret key from.
 * @returns A Result containing a NodeKey object representing the derived secret key or an error.
 */
export function tryCreateSecretKey(key: string): Result<{ secretKey: NodeKey }> {
  if (!$isStr(key)) {
    return $err({ msg: 'Crypto NodeJS API - Key Generation: Empty key', desc: 'Key must be a non-empty string' });
  }

  try {
    const hashedKey = nodeCrypto.createHash(CONFIG.hash.sha256.node).update(key).digest();
    const secretKey = nodeCrypto.createSecretKey(hashedKey);
    return $ok({ secretKey });
  } catch (error) {
    return $err({ msg: 'Crypto NodeJS API - Key Generation: Failed to create secret key', desc: $fmtError(error) });
  }
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
  if (!$isStr(data)) {
    return $err({
      msg: 'Crypto NodeJS API - Encryption: Empty data for encryption',
      desc: 'Data must be a non-empty string',
    });
  }

  if (!isNodeKey(secretKey)) {
    return $err({
      msg: 'Crypto NodeJS API - Encryption: Invalid encryption key',
      desc: 'Expected a NodeKey (crypto.KeyObject)',
    });
  }

  try {
    const iv = nodeCrypto.randomBytes(CONFIG.encrypt.aes256gcm.ivLength);
    const cipher = nodeCrypto.createCipheriv(CONFIG.encrypt.aes256gcm.node, secretKey, iv);
    const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    const { result: ivString, error: ivError } = tryBytesToString(iv, 'base64url');
    const { result: cipherString, error: cipherError } = tryBytesToString(encrypted, 'base64url');
    const { result: tagString, error: tagError } = tryBytesToString(tag, 'base64url');

    if (ivError || cipherError || tagError) {
      return $err({
        msg: 'Crypto NodeJS API - Encryption: Failed to convert IV or encrypted data or tag',
        desc: `Conversion error: ${ivError || cipherError || tagError}`,
      });
    }

    return $ok(`${ivString}.${cipherString}.${tagString}.`);
  } catch (error) {
    return $err({ msg: 'Crypto NodeJS API - Encryption: Failed to encrypt data', desc: $fmtError(error) });
  }
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
  if (isInNodeEncryptedFormat(encrypted) === false) {
    return $err({
      msg: 'Crypto NodeJS API - Decryption: Invalid encrypted data format',
      desc: 'Encrypted data must be in the format "iv.cipher.tag."',
    });
  }

  const [iv, cipher, tag] = encrypted.split('.', 4);
  if (!$isStr(iv) || !$isStr(cipher) || !$isStr(tag)) {
    return $err({
      msg: 'Crypto NodeJS API - Decryption: Invalid encrypted data',
      desc: 'Encrypted data must contain valid IV, encrypted data, and tag components',
    });
  }

  if (!isNodeKey(secretKey)) {
    return $err({
      msg: 'Crypto NodeJS API - Decryption: Invalid decryption key',
      desc: 'Expected a NodeKey (crypto.KeyObject)',
    });
  }

  const { bytes: ivBytes, error: ivError } = tryStringToBytes(iv, 'base64url');
  const { bytes: cipherBytes, error: cipherError } = tryStringToBytes(cipher, 'base64url');
  const { bytes: tagBytes, error: tagError } = tryStringToBytes(tag, 'base64url');

  if (ivError || cipherError || tagError) {
    return $err({
      msg: 'Crypto NodeJS API - Decryption: Failed to convert IV or encrypted data or tag',
      desc: `Conversion error: ${ivError || cipherError || tagError}`,
    });
  }

  try {
    const decipher = nodeCrypto.createDecipheriv(CONFIG.encrypt.aes256gcm.node, secretKey, ivBytes);
    decipher.setAuthTag(tagBytes);

    const decrypted = Buffer.concat([decipher.update(cipherBytes), decipher.final()]);
    return tryBytesToString(decrypted, 'utf8');
  } catch (error) {
    return $err({ msg: 'Crypto NodeJS API - Decryption: Failed to decrypt data', desc: $fmtError(error) });
  }
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
  const { result, error } = tryStringifyObj(data);
  if (error) return $err(error);
  return tryEncrypt(result, secretKey);
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
  const { result, error } = tryDecrypt(encrypted, secretKey);
  if (error) return $err(error);
  return tryParseToObj<T>(result);
}

// ----------------------------------------------------------------

/**
 * Generates a UUID (v4).
 *
 * @returns A string representing the generated UUID.
 * @throws {Error} If UUID generation fails.
 */
export function generateUuid(): string {
  const { result, error } = tryGenerateUuid();
  if (error) throw new Error($fmtResultErr(error));
  return result;
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
  const { secretKey, error } = tryCreateSecretKey(key);
  if (error) throw new Error($fmtResultErr(error));
  return secretKey;
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
  const { result, error } = tryEncrypt(data, secretKey);
  if (error) throw new Error($fmtResultErr(error));
  return result;
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
  const { result, error } = tryDecrypt(encrypted, secretKey);
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
 * @returns A string representing the encrypted object in the specified format.
 * @throws {Error} If the input data or key is invalid, or if encryption fails.
 */
export function encryptObj<T extends object = Record<string, unknown>>(data: T, secretKey: NodeKey): string {
  const { result, error } = tryEncryptObj(data, secretKey);
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
 * @returns An object representing the decrypted data.
 * @throws {Error} If the input data or key is invalid, or if decryption fails.
 */
export function decryptObj<T extends object = Record<string, unknown>>(
  encrypted: string,
  secretKey: NodeKey,
): { result: T } {
  const { result, error } = tryDecryptObj<T>(encrypted, secretKey);
  if (error) throw new Error($fmtResultErr(error));
  return { result };
}
