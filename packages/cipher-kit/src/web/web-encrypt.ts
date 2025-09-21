import { $err, $fmtError, $fmtResultErr, $ok, type Result } from '~/error';
import type { WebApiKey } from '~/types';
import { $isStr, isInWebApiEncryptedFormat, isWebApiKey, parseToObj, stringifyObj, WEB_API_ALGORITHM } from '~/utils';
import { tryBytesToString, tryStringToBytes } from './web-encode';

export function generateUuid(): string {
  const { result, error } = tryGenerateUuid();
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

export async function hash(data: string): Promise<string> {
  const { result, error } = await tryHash(data);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

export async function createSecretKey(key: string): Promise<WebApiKey> {
  const { secretKey, error } = await tryCreateSecretKey(key);
  if (error) throw new Error($fmtResultErr(error));
  return secretKey;
}

export async function encrypt(data: string, secretKey: WebApiKey): Promise<string> {
  const { result, error } = await tryEncrypt(data, secretKey);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

export async function decrypt(encrypted: string, secretKey: WebApiKey): Promise<string> {
  const { result, error } = await tryDecrypt(encrypted, secretKey);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

export async function encryptObj<T extends object = Record<string, unknown>>(
  data: T,
  secretKey: WebApiKey,
): Promise<string> {
  const { result, error } = await tryEncryptObj(data, secretKey);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

export async function decryptObj<T extends object = Record<string, unknown>>(
  encrypted: string,
  secretKey: WebApiKey,
): Promise<{ result: T }> {
  const { result, error } = await tryDecryptObj<T>(encrypted, secretKey);
  if (error) throw new Error($fmtResultErr(error));
  return { result };
}

// ----------------------------------------------------------------

export function tryGenerateUuid(): Result<string> {
  try {
    return $ok(crypto.randomUUID());
  } catch (error) {
    return $err({ msg: 'Crypto Web API - UUID Generation: Failed to generate UUID', desc: $fmtError(error) });
  }
}

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
    const encrypted = await crypto.subtle.encrypt({ name: WEB_API_ALGORITHM, iv: iv }, secretKey, bytes);

    const { result: ivString, error: ivError } = tryBytesToString(iv, 'base64url');
    const { result: encryptedString, error: encryptedError } = tryBytesToString(encrypted, 'base64url');

    if (ivError || encryptedError) {
      return $err({
        msg: 'Crypto Web API - Encryption: Failed to convert IV or encrypted data',
        desc: `Conversion error: ${ivError || encryptedError}`,
      });
    }

    return $ok(`${ivString}.${encryptedString}.`);
  } catch (error) {
    return $err({ msg: 'Crypto Web API - Encryption: Failed to encrypt data', desc: $fmtError(error) });
  }
}

export async function tryDecrypt(encrypted: string, secretKey: WebApiKey): Promise<Result<string>> {
  if (isInWebApiEncryptedFormat(encrypted) === false) {
    return $err({
      msg: 'Crypto Web API - Decryption: Invalid encrypted data format',
      desc: 'Encrypted data must be in the format "iv.encryptedData."',
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
  const { bytes: encryptedBytes, error: encryptedError } = tryStringToBytes(encryptedWithTag, 'base64url');

  if (ivError || encryptedError) {
    return $err({
      msg: 'Crypto Web API - Decryption: Failed to convert IV or encrypted data',
      desc: `Conversion error: ${ivError || encryptedError}`,
    });
  }

  try {
    const decrypted = await crypto.subtle.decrypt({ name: WEB_API_ALGORITHM, iv: ivBytes }, secretKey, encryptedBytes);
    return tryBytesToString(decrypted, 'utf8');
  } catch (error) {
    return $err({ msg: 'Crypto Web API - Decryption: Failed to decrypt data', desc: $fmtError(error) });
  }
}

export async function tryEncryptObj<T extends object = Record<string, unknown>>(
  data: T,
  secretKey: WebApiKey,
): Promise<Result<string>> {
  const { result, error } = stringifyObj(data);
  if (error) return $err(error);
  return await tryEncrypt(result, secretKey);
}

export async function tryDecryptObj<T extends object = Record<string, unknown>>(
  encrypted: string,
  secretKey: WebApiKey,
): Promise<Result<{ result: T }>> {
  const { result, error } = await tryDecrypt(encrypted, secretKey);
  if (error) return $err(error);
  return parseToObj<T>(result);
}
