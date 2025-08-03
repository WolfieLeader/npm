import { Buffer } from 'node:buffer';
import { $err, $ok, $stringifyError, type Result } from '~/error';
import { $isString, type WebApiKey } from '~/types';
import { ENCODE_FORMAT, WEB_API_ALGORITHM } from './index';

export type { WebApiKey } from '~/types';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const webApiRegex = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.$/;

export function newUuid(): Result<string> {
  try {
    return $ok(crypto.randomUUID());
  } catch (error) {
    return $err({ message: 'Failed to generate UUID with Crypto Web API', description: $stringifyError(error) });
  }
}

export async function hash(data: string): Promise<Result<string>> {
  if (!$isString(data)) {
    return $err({ message: 'Empty data for hashing', description: 'Data must be a non-empty string' });
  }

  try {
    const hashed = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    return $ok(Buffer.from(hashed).toString(ENCODE_FORMAT));
  } catch (error) {
    return $err({ message: 'Failed to hash data with Crypto Web API', description: $stringifyError(error) });
  }
}

export async function newSecretKey(key: string | WebApiKey): Promise<Result<{ secretKey: WebApiKey }>> {
  if (typeof key === 'string') {
    if (!$isString(key)) return $err({ message: 'Empty key for Crypto Web API', description: 'Invalid secret key' });

    try {
      const hashedKey = await crypto.subtle.digest('SHA-256', encoder.encode(key));
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
  if (!$isString(data)) {
    return $err({ message: 'Empty data for encryption', description: 'Data must be a non-empty string' });
  }

  if (!$isWebApiKey(secretKey)) {
    return $err({ message: 'Invalid encryption key', description: 'Expected a webcrypto.CryptoKey' });
  }

  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedWithTag = await crypto.subtle.encrypt(
      { name: WEB_API_ALGORITHM, iv: iv },
      secretKey,
      encoder.encode(data),
    );

    return $ok(`${Buffer.from(iv).toString(ENCODE_FORMAT)}.${Buffer.from(encryptedWithTag).toString(ENCODE_FORMAT)}.`);
  } catch (error) {
    return $err({ message: 'Failed to encrypt data with Crypto Web API', description: $stringifyError(error) });
  }
}

export async function decrypt(encrypted: string, secretKey: WebApiKey): Promise<Result<string>> {
  if (webApiRegex.test(encrypted) === false) {
    return $err({
      message: 'Invalid encrypted data format',
      description: 'Data must be in the format "iv.encryptedWithTag."',
    });
  }

  const [iv, encryptedWithTag] = encrypted.split('.', 3);
  if (!$isString(iv) || !$isString(encryptedWithTag)) {
    return $err({
      message: 'Invalid parameters for decryption',
      description: 'IV and encrypted data must be non-empty strings',
    });
  }

  if (!$isWebApiKey(secretKey)) {
    return $err({ message: 'Invalid decryption key', description: 'Expected a webcrypto.CryptoKey' });
  }

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: WEB_API_ALGORITHM, iv: Buffer.from(iv, ENCODE_FORMAT) },
      secretKey,
      Buffer.from(encryptedWithTag, ENCODE_FORMAT),
    );

    return $ok(decoder.decode(decrypted));
  } catch (error) {
    return $err({ message: 'Failed to decrypt data with Crypto Web API', description: $stringifyError(error) });
  }
}

function $isWebApiKey(key: unknown): key is WebApiKey {
  return (
    key !== null &&
    key !== undefined &&
    typeof key === 'object' &&
    'type' in key &&
    typeof key.type === 'string' &&
    'algorithm' in key &&
    typeof key.algorithm === 'object' &&
    'extractable' in key &&
    typeof key.extractable === 'boolean' &&
    'usages' in key &&
    Array.isArray(key.usages) &&
    key.usages.every((usage) => typeof usage === 'string')
  );
}
