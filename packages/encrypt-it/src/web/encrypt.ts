import { $err, $ok, $stringifyError, type Result } from '~/error';
import type { WebApiKey } from '~/types';
import { $isStr } from '~/utils';
import { decode, encode } from './encode';
import { $isWebApiKey, ENCRYPTED_WEB_API_REGEX } from './utils';

export const WEB_API_ALGORITHM = 'AES-GCM';

export async function hash(data: string): Promise<Result<string>> {
  if (!$isStr(data)) {
    return $err({ message: 'Empty data for hashing', description: 'Data must be a non-empty string' });
  }

  const { bytes, error } = encode(data, 'utf8');
  if (error) return $err(error);

  try {
    const hashed = await crypto.subtle.digest('SHA-256', bytes);
    return decode(hashed, 'base64url');
  } catch (error) {
    return $err({ message: 'Failed to hash data with Crypto Web API', description: $stringifyError(error) });
  }
}

export async function newSecretKey(key: string | WebApiKey): Promise<Result<{ secretKey: WebApiKey }>> {
  if (typeof key === 'string') {
    if (!$isStr(key, 1)) return $err({ message: 'Empty key for Crypto Web API', description: 'Invalid secret key' });

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
      return $err({ message: 'Failed to create secret key with Crypto Web API', description: $stringifyError(error) });
    }
  }

  if (!$isWebApiKey(key)) return $err({ message: 'Invalid secret key', description: 'Expected a webcrypto.CryptoKey' });
  return $ok({ secretKey: key });
}

export async function encrypt(data: string, secretKey: WebApiKey): Promise<Result<string>> {
  if (!$isStr(data)) {
    return $err({ message: 'Empty data for encryption', description: 'Data must be a non-empty string' });
  }

  if (!$isWebApiKey(secretKey)) {
    return $err({ message: 'Invalid encryption key', description: 'Expected a webcrypto.CryptoKey' });
  }

  const { bytes, error } = encode(data, 'utf8');
  if (error) return $err(error);

  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: WEB_API_ALGORITHM, iv: iv }, secretKey, bytes);

    const { result: decodedIv, error: ivError } = decode(iv, 'base64url');
    const { result: decodedEncrypted, error: encryptedError } = decode(encrypted, 'base64url');

    if (ivError || encryptedError) {
      return $err({ message: 'Failed to encode IV or encrypted data', description: 'Encoding error' });
    }

    return $ok(`${decodedIv}.${decodedEncrypted}.`);
  } catch (error) {
    return $err({ message: 'Failed to encrypt data with Crypto Web API', description: $stringifyError(error) });
  }
}

export async function decrypt(encrypted: string, secretKey: WebApiKey): Promise<Result<string>> {
  if (ENCRYPTED_WEB_API_REGEX.test(encrypted) === false) {
    return $err({
      message: 'Invalid encrypted data format',
      description: 'Data must be in the format "iv.encryptedWithTag."',
    });
  }

  const [iv, encryptedWithTag] = encrypted.split('.', 3);
  if (!$isStr(iv, 1) || !$isStr(encryptedWithTag, 1)) {
    return $err({
      message: 'Invalid parameters for decryption',
      description: 'IV and encrypted data must be non-empty strings',
    });
  }

  if (!$isWebApiKey(secretKey)) {
    return $err({ message: 'Invalid decryption key', description: 'Expected a webcrypto.CryptoKey' });
  }

  const { bytes: ivBytes, error: ivError } = encode(iv, 'base64url');
  const { bytes: encryptedBytes, error: encryptedError } = encode(encryptedWithTag, 'base64url');
  if (ivError || encryptedError) {
    return $err({ message: 'Failed to encode IV or encrypted data', description: 'Encoding error' });
  }

  try {
    const decrypted = await crypto.subtle.decrypt({ name: WEB_API_ALGORITHM, iv: ivBytes }, secretKey, encryptedBytes);

    return decode(decrypted, 'utf8');
  } catch (error) {
    return $err({ message: 'Failed to decrypt data with Crypto Web API', description: $stringifyError(error) });
  }
}
