import { $err, $ok, $stringifyError, type Result } from '~/error';
import { $isString, type WebApiKey } from '~/types';
import { $decode, $encode } from './encode';
import { $isWebApiKey, WEB_API_REGEX } from './utils';

export const WEB_API_ALGORITHM = 'AES-GCM';

async function $hash(data: string) {
  return await crypto.subtle.digest('SHA-256', $encode(data, 'utf8'));
}

export async function hash(data: string): Promise<Result<string>> {
  if (!$isString(data)) {
    return $err({ message: 'Empty data for hashing', description: 'Data must be a non-empty string' });
  }

  try {
    const hashed = await $hash(data);
    return $ok($decode(hashed));
  } catch (error) {
    return $err({ message: 'Failed to hash data with Crypto Web API', description: $stringifyError(error) });
  }
}

export async function newSecretKey(key: string | WebApiKey): Promise<Result<{ secretKey: WebApiKey }>> {
  if (typeof key === 'string') {
    if (!$isString(key)) return $err({ message: 'Empty key for Crypto Web API', description: 'Invalid secret key' });

    try {
      const hashedKey = await $hash(key);
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
      $encode(data, 'utf8'),
    );

    return $ok(`${$decode(iv)}.${$decode(encryptedWithTag)}.`);
  } catch (error) {
    return $err({ message: 'Failed to encrypt data with Crypto Web API', description: $stringifyError(error) });
  }
}

export async function decrypt(encrypted: string, secretKey: WebApiKey): Promise<Result<string>> {
  if (WEB_API_REGEX.test(encrypted) === false) {
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
      { name: WEB_API_ALGORITHM, iv: $encode(iv) },
      secretKey,
      $encode(encryptedWithTag),
    );

    return $ok($decode(decrypted, 'utf8'));
  } catch (error) {
    return $err({ message: 'Failed to decrypt data with Crypto Web API', description: $stringifyError(error) });
  }
}
