import { $err, $ok, $stringifyError, type Result } from '~/error';
import type { WebApiKey } from '~/types';
import { $isStr, isInWebApiEncryptionFormat, isWebApiKey, parseToObj, stringifyObj, WEB_API_ALGORITHM } from '~/utils';
import { decode, encode } from './encode';

export function generateUuid(): Result<string> {
  try {
    return $ok(crypto.randomUUID());
  } catch (error) {
    return $err({ msg: 'Failed to generate UUID with Crypto Web API', desc: $stringifyError(error) });
  }
}

export async function hash(data: string): Promise<Result<string>> {
  if (!$isStr(data)) {
    return $err({ msg: 'Empty data for hashing', desc: 'Data must be a non-empty string' });
  }

  const { bytes, error } = encode(data, 'utf8');
  if (error) return $err(error);

  try {
    const hashed = await crypto.subtle.digest('SHA-256', bytes);
    return decode(hashed, 'base64url');
  } catch (error) {
    return $err({ msg: 'Failed to hash data with Crypto Web API', desc: $stringifyError(error) });
  }
}

export async function createSecretKey(key: string | WebApiKey): Promise<Result<{ secretKey: WebApiKey }>> {
  if (typeof key === 'string') {
    if (!$isStr(key, 1)) return $err({ msg: 'Empty key for Crypto Web API', desc: 'Invalid secret key' });

    const { bytes, error } = encode(key, 'utf8');
    if (error) return $err(error);

    try {
      const hashedKey = await crypto.subtle.digest('SHA-256', bytes);
      const secretKey = await crypto.subtle.importKey('raw', hashedKey, { name: WEB_API_ALGORITHM }, true, [
        'encrypt',
        'decrypt',
      ]);
      return $ok({ secretKey });
    } catch (error) {
      return $err({ msg: 'Failed to create secret key with Crypto Web API', desc: $stringifyError(error) });
    }
  }

  if (!isWebApiKey(key)) return $err({ msg: 'Invalid secret key', desc: 'Expected a webcrypto.CryptoKey' });
  return $ok({ secretKey: key });
}

export async function encrypt(data: string, secretKey: WebApiKey): Promise<Result<string>> {
  if (!$isStr(data)) {
    return $err({ msg: 'Empty data for encryption', desc: 'Data must be a non-empty string' });
  }

  if (!isWebApiKey(secretKey)) {
    return $err({ msg: 'Invalid encryption key', desc: 'Expected a webcrypto.CryptoKey' });
  }

  const { bytes, error } = encode(data, 'utf8');
  if (error) return $err(error);

  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: WEB_API_ALGORITHM, iv: iv }, secretKey, bytes);

    const { result: decodedIv, error: ivError } = decode(iv, 'base64url');
    const { result: decodedEncrypted, error: encryptedError } = decode(encrypted, 'base64url');

    if (ivError || encryptedError) {
      return $err({ msg: 'Failed to encode IV or encrypted data', desc: 'Encoding error' });
    }

    return $ok(`${decodedIv}.${decodedEncrypted}.`);
  } catch (error) {
    return $err({ msg: 'Failed to encrypt data with Crypto Web API', desc: $stringifyError(error) });
  }
}

export async function decrypt(encrypted: string, secretKey: WebApiKey): Promise<Result<string>> {
  if (isInWebApiEncryptionFormat(encrypted) === false) {
    return $err({
      msg: 'Invalid encrypted data format',
      desc: 'Data must be in the format "iv.encryptedWithTag."',
    });
  }

  const [iv, encryptedWithTag] = encrypted.split('.', 3);
  if (!$isStr(iv, 1) || !$isStr(encryptedWithTag, 1)) {
    return $err({
      msg: 'Invalid parameters for decryption',
      desc: 'IV and encrypted data must be non-empty strings',
    });
  }

  if (!isWebApiKey(secretKey)) {
    return $err({ msg: 'Invalid decryption key', desc: 'Expected a webcrypto.CryptoKey' });
  }

  const { bytes: ivBytes, error: ivError } = encode(iv, 'base64url');
  const { bytes: encryptedBytes, error: encryptedError } = encode(encryptedWithTag, 'base64url');
  if (ivError || encryptedError) {
    return $err({ msg: 'Failed to encode IV or encrypted data', desc: 'Encoding error' });
  }

  try {
    const decrypted = await crypto.subtle.decrypt({ name: WEB_API_ALGORITHM, iv: ivBytes }, secretKey, encryptedBytes);

    return decode(decrypted, 'utf8');
  } catch (error) {
    return $err({ msg: 'Failed to decrypt data with Crypto Web API', desc: $stringifyError(error) });
  }
}

export async function encryptObj(data: Record<string, unknown>, secretKey: WebApiKey): Promise<Result<string>> {
  const { result, error } = stringifyObj(data);
  if (error) return $err(error);
  return await encrypt(result, secretKey);
}

export async function decryptObj(
  encrypted: string,
  secretKey: WebApiKey,
): Promise<Result<{ result: Record<string, unknown> }>> {
  const { result, error } = await decrypt(encrypted, secretKey);
  if (error) return $err(error);
  return parseToObj(result);
}
