import { $err, $fmtError, $fmtResultErr, $ok, type Result } from '~/error';
import type { WebApiKey } from '~/types';
import {
  $isStr,
  isInWebApiEncryptedFormat,
  isWebApiKey,
  tryParseToObj,
  tryStringifyObj,
  WEB_API_ALGORITHM,
} from '~/utils';
import { tryBytesToString, tryStringToBytes } from './web-encode';

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
 * Hashes the input string using SHA-256 and returns the hash in base64url format.
 *
 * @param data - The input string to hash.
 * @returns A string representing the SHA-256 hash in base64url format.
 * @throws {Error} If the input data is invalid or hashing fails.
 */
export async function hash(data: string): Promise<string> {
  const { result, error } = await tryHash(data);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Derives a secret key from the provided string for encryption/decryption.
 * Internally, the key is hashed using SHA-256 to ensure it meets the required length.
 *
 * @param key - The input string to derive the secret key from.
 * @returns A WebApiKey object representing the derived secret key.
 * @throws {Error} If the input key is invalid or key generation fails.
 */
export async function createSecretKey(key: string): Promise<WebApiKey> {
  const { secretKey, error } = await tryCreateSecretKey(key);
  if (error) throw new Error($fmtResultErr(error));
  return secretKey;
}

/**
 * Encrypts the input string using the provided secret key.
 * The output is a string in the format "iv.cipherWithTag." where each component is base64url encoded.
 *
 * @param data - The input string to encrypt.
 * @param secretKey - The WebApiKey object used for encryption.
 * @returns A string representing the encrypted data in the specified format.
 * @throws {Error} If the input data or key is invalid, or if encryption fails.
 */
export async function encrypt(data: string, secretKey: WebApiKey): Promise<string> {
  const { result, error } = await tryEncrypt(data, secretKey);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Decrypts the input string using the provided secret key.
 * The input must be in the format "iv.cipherWithTag" where each component is base64url encoded.
 *
 * @param encrypted - The input string to decrypt.
 * @param secretKey - The WebApiKey object used for decryption.
 * @returns A string representing the decrypted data.
 * @throws {Error} If the input data or key is invalid, or if decryption fails.
 */
export async function decrypt(encrypted: string, secretKey: WebApiKey): Promise<string> {
  const { result, error } = await tryDecrypt(encrypted, secretKey);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Encrypts the input object using the provided secret key.
 * The object is first serialized to a JSON string before encryption.
 * The output is a string in the format "iv.cipherWithTag." where each component is base64url encoded.
 *
 * @param data - The input object to encrypt.
 * @param secretKey - The WebApiKey object used for encryption.
 * @returns A string representing the encrypted object in the specified format.
 * @throws {Error} If the input data or key is invalid, or if encryption fails.
 */
export async function encryptObj<T extends object = Record<string, unknown>>(
  data: T,
  secretKey: WebApiKey,
): Promise<string> {
  const { result, error } = await tryEncryptObj(data, secretKey);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Decrypts the input string to an object using the provided secret key.
 * The input must be in the format "iv.cipherWithTag." where each component is base64url encoded.
 * The decrypted string is parsed as JSON to reconstruct the original object.
 *
 * @param encrypted - The input string to decrypt.
 * @param secretKey - The WebApiKey object used for decryption.
 * @returns An object representing the decrypted data.
 * @throws {Error} If the input data or key is invalid, or if decryption fails.
 */
export async function decryptObj<T extends object = Record<string, unknown>>(
  encrypted: string,
  secretKey: WebApiKey,
): Promise<{ result: T }> {
  const { result, error } = await tryDecryptObj<T>(encrypted, secretKey);
  if (error) throw new Error($fmtResultErr(error));
  return { result };
}

// ----------------------------------------------------------------

/**
 * Generates a UUID (v4).
 *
 * @returns A Result containing a string representing the generated UUID or an error.
 */
export function tryGenerateUuid(): Result<string> {
  try {
    return $ok(crypto.randomUUID());
  } catch (error) {
    return $err({ msg: 'Crypto Web API - UUID Generation: Failed to generate UUID', desc: $fmtError(error) });
  }
}

/**
 * Hashes the input string using SHA-256 and returns the hash in base64url format.
 *
 * @param data - The input string to hash.
 * @returns A Result containing a string representing the SHA-256 hash in base64url format or an error.
 */
export async function tryHash(data: string): Promise<Result<string>> {
  if (!$isStr(data, 0)) {
    return $err({ msg: 'Crypto Web API - Hashing: Empty data for hashing', desc: 'Data must be a non-empty string' });
  }

  const { bytes, error } = tryStringToBytes(data, 'utf8');
  if (error) return $err(error);

  try {
    const hashed = await crypto.subtle.digest('SHA-256', bytes);
    return tryBytesToString(hashed, 'base64url');
  } catch (error) {
    return $err({ msg: 'Crypto Web API - Hashing: Failed to hash data', desc: $fmtError(error) });
  }
}

/**
 * Derives a secret key from the provided string for encryption/decryption.
 * Internally, the key is hashed using SHA-256 to ensure it meets the required length.
 *
 * @param key - The input string to derive the secret key from.
 * @returns A Result containing a WebApiKey object representing the derived secret key or an error.
 */
export async function tryCreateSecretKey(key: string): Promise<Result<{ secretKey: WebApiKey }>> {
  if (!$isStr(key)) {
    return $err({ msg: 'Crypto Web API - Key Generation: Empty key', desc: 'Key must be a non-empty string' });
  }

  const { bytes, error } = tryStringToBytes(key, 'utf8');
  if (error) return $err(error);

  try {
    const hashedKey = await crypto.subtle.digest('SHA-256', bytes);
    const secretKey = await crypto.subtle.importKey('raw', hashedKey, { name: WEB_API_ALGORITHM }, true, [
      'encrypt',
      'decrypt',
    ]);

    return $ok({ secretKey });
  } catch (error) {
    return $err({
      msg: 'Crypto Web API - Key Generation: Failed to create secret key',
      desc: $fmtError(error),
    });
  }
}

/**
 * Encrypts the input string using the provided secret key.
 * The output is a string in the format "iv.cipherWithTag." where each component is base64url encoded.
 *
 * @param data - The input string to encrypt.
 * @param secretKey - The WebApiKey object used for encryption.
 * @returns A Result containing a string representing the encrypted data in the specified format or an error.
 */
export async function tryEncrypt(data: string, secretKey: WebApiKey): Promise<Result<string>> {
  if (!$isStr(data)) {
    return $err({
      msg: 'Crypto Web API - Encryption: Empty data for encryption',
      desc: 'Data must be a non-empty string',
    });
  }

  if (!isWebApiKey(secretKey)) {
    return $err({
      msg: 'Crypto Web API - Encryption: Invalid encryption key',
      desc: 'Expected a WebApiKey (webcrypto.CryptoKey)',
    });
  }

  const { bytes, error } = tryStringToBytes(data, 'utf8');
  if (error) return $err(error);

  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipherWithTag = await crypto.subtle.encrypt({ name: WEB_API_ALGORITHM, iv: iv }, secretKey, bytes);

    const { result: ivString, error: ivError } = tryBytesToString(iv, 'base64url');
    const { result: cipherString, error: cipherError } = tryBytesToString(cipherWithTag, 'base64url');

    if (ivError || cipherError) {
      return $err({
        msg: 'Crypto Web API - Encryption: Failed to convert IV or encrypted data',
        desc: `Conversion error: ${ivError || cipherError}`,
      });
    }

    return $ok(`${ivString}.${cipherString}.`);
  } catch (error) {
    return $err({ msg: 'Crypto Web API - Encryption: Failed to encrypt data', desc: $fmtError(error) });
  }
}

/**
 * Decrypts the input string using the provided secret key.
 * The input must be in the format "iv.cipherWithTag." where each component is base64url encoded.
 *
 * @param encrypted - The input string to decrypt.
 * @param secretKey - The WebApiKey object used for decryption.
 * @returns A Result containing a string representing the decrypted data or an error.
 */
export async function tryDecrypt(encrypted: string, secretKey: WebApiKey): Promise<Result<string>> {
  if (isInWebApiEncryptedFormat(encrypted) === false) {
    return $err({
      msg: 'Crypto Web API - Decryption: Invalid encrypted data format',
      desc: 'Encrypted data must be in the format "iv.cipherWithTag."',
    });
  }

  const [iv, encryptedWithTag] = encrypted.split('.', 3);
  if (!$isStr(iv) || !$isStr(encryptedWithTag)) {
    return $err({
      msg: 'Crypto Web API - Decryption: Invalid encrypted data',
      desc: 'Encrypted data must contain valid IV, encrypted and tag components',
    });
  }

  if (!isWebApiKey(secretKey)) {
    return $err({
      msg: 'Crypto Web API - Decryption: Invalid decryption key',
      desc: 'Expected a WebApiKey (webcrypto.CryptoKey)',
    });
  }

  const { bytes: ivBytes, error: ivError } = tryStringToBytes(iv, 'base64url');
  const { bytes: cipherWithTagBytes, error: cipherWithTagError } = tryStringToBytes(encryptedWithTag, 'base64url');

  if (ivError || cipherWithTagError) {
    return $err({
      msg: 'Crypto Web API - Decryption: Failed to convert IV or encrypted data',
      desc: `Conversion error: ${ivError || cipherWithTagError}`,
    });
  }

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: WEB_API_ALGORITHM, iv: ivBytes },
      secretKey,
      cipherWithTagBytes,
    );
    return tryBytesToString(decrypted, 'utf8');
  } catch (error) {
    return $err({ msg: 'Crypto Web API - Decryption: Failed to decrypt data', desc: $fmtError(error) });
  }
}

/**
 * Encrypts the input object using the provided secret key.
 * The object is first serialized to a JSON string before encryption.
 * The output is a string in the format "iv.cipherWithTag." where each component is base64url encoded.
 *
 * @param data - The input object to encrypt.
 * @param secretKey - The WebApiKey object used for encryption.
 * @returns A Result containing a string representing the encrypted object in the specified format or an error.
 */
export async function tryEncryptObj<T extends object = Record<string, unknown>>(
  data: T,
  secretKey: WebApiKey,
): Promise<Result<string>> {
  const { result, error } = tryStringifyObj(data);
  if (error) return $err(error);
  return await tryEncrypt(result, secretKey);
}

/**
 * Decrypts the input string to an object using the provided secret key.
 * The input must be in the format "iv.cipherWithTag." where each component is base64url encoded.
 * The decrypted string is parsed as JSON to reconstruct the original object.
 *
 * @param encrypted - The input string to decrypt.
 * @param secretKey - The WebApiKey object used for decryption.
 * @returns A Result containing an object representing the decrypted data or an error.
 */
export async function tryDecryptObj<T extends object = Record<string, unknown>>(
  encrypted: string,
  secretKey: WebApiKey,
): Promise<Result<{ result: T }>> {
  const { result, error } = await tryDecrypt(encrypted, secretKey);
  if (error) return $err(error);
  return tryParseToObj<T>(result);
}
