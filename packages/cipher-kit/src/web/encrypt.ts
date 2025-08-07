import { $err, $ok, $stringifyError, type Result } from '~/error';
import type { WebApiKey } from '~/types';
import { $isStr, isInWebApiEncryptionFormat, isWebApiKey, parseToObj, stringifyObj, WEB_API_ALGORITHM } from '~/utils';
import { decode, encode } from './encode';

export function generateUuid(): Result<string> {
  try {
    return $ok(crypto.randomUUID());
  } catch (error) {
    return $err({ msg: 'Crypto Web API: Failed to generate UUID', desc: $stringifyError(error) });
  }
}

export async function hash(data: string): Promise<Result<string>> {
  if (!$isStr(data, 0)) {
    return $err({ msg: 'Crypto Web API: Empty data for hashing', desc: 'Data must be a non-empty string' });
  }

  const { bytes, error } = encode(data, 'utf8');
  if (error) return $err(error);

  try {
    const hashed = await crypto.subtle.digest('SHA-256', bytes);
    return decode(hashed, 'base64url');
  } catch (error) {
    return $err({ msg: 'Crypto Web API: Failed to hash data', desc: $stringifyError(error) });
  }
}

export async function createSecretKey(key: string | WebApiKey): Promise<Result<{ secretKey: WebApiKey }>> {
  if (typeof key === 'string') {
    try {
      if (!$isStr(key)) return $err({ msg: 'Crypto Web API: Empty key', desc: 'Key must be a non-empty string' });
      const { bytes, error } = encode(key, 'utf8');
      if (error) return $err(error);

      const hashedKey = await crypto.subtle.digest('SHA-256', bytes);
      const secretKey = await crypto.subtle.importKey('raw', hashedKey, { name: WEB_API_ALGORITHM }, true, [
        'encrypt',
        'decrypt',
      ]);
      return $ok({ secretKey });
    } catch (error) {
      return $err({ msg: 'Crypto Web API: Failed to create secret key', desc: $stringifyError(error) });
    }
  }

  if (!isWebApiKey(key)) {
    return $err({ msg: 'Crypto Web API: Invalid secret key', desc: 'Expected a WebApiKey(webcrypto.CryptoKey)' });
  }

  return $ok({ secretKey: key });
}

export async function encrypt(data: string, secretKey: WebApiKey): Promise<Result<string>> {
  try {
    if (!$isStr(data)) {
      return $err({ msg: 'Crypto Web API: Empty data for encryption', desc: 'Data must be a non-empty string' });
    }

    if (!isWebApiKey(secretKey)) {
      return $err({ msg: 'Crypto Web API: Invalid encryption key', desc: 'Expected a NodeKey(crypto.KeyObject)' });
    }

    const { bytes, error } = encode(data, 'utf8');
    if (error) return $err(error);

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: WEB_API_ALGORITHM, iv: iv }, secretKey, bytes);

    const { result: decodedIv, error: ivError } = decode(iv, 'base64url');
    const { result: decodedEncrypted, error: encryptedError } = decode(encrypted, 'base64url');

    if (ivError || encryptedError) {
      return $err({
        msg: 'Crypto Web API: Failed to encode IV or encrypted data',
        desc: `Decoding error: ${ivError || encryptedError}`,
      });
    }

    return $ok(`${decodedIv}.${decodedEncrypted}.`);
  } catch (error) {
    return $err({ msg: 'Crypto Web API: Failed to encrypt data', desc: $stringifyError(error) });
  }
}

export async function decrypt(encrypted: string, secretKey: WebApiKey): Promise<Result<string>> {
  if (isInWebApiEncryptionFormat(encrypted) === false) {
    return $err({
      msg: 'Crypto Web API: Invalid encrypted data format',
      desc: 'Encrypted data must be in the format "iv.encryptedData.tag."',
    });
  }

  const [iv, encryptedWithTag] = encrypted.split('.', 3);
  if (!$isStr(iv) || !$isStr(encryptedWithTag)) {
    return $err({
      msg: 'Crypto Web API: Invalid encrypted data',
      desc: 'Encrypted data must contain valid IV, encrypted and tag components',
    });
  }

  if (!isWebApiKey(secretKey)) {
    return $err({ msg: 'Crypto Web API: Invalid decryption key', desc: 'Expected a crypto.KeyObject' });
  }

  const { bytes: ivBytes, error: ivError } = encode(iv, 'base64url');
  const { bytes: encryptedBytes, error: encryptedError } = encode(encryptedWithTag, 'base64url');
  if (ivError || encryptedError) {
    return $err({
      msg: 'Crypto Web API: Failed to decode IV or encrypted data',
      desc: `Encoding error: ${ivError || encryptedError}`,
    });
  }

  try {
    const decrypted = await crypto.subtle.decrypt({ name: WEB_API_ALGORITHM, iv: ivBytes }, secretKey, encryptedBytes);
    return decode(decrypted, 'utf8');
  } catch (error) {
    return $err({ msg: 'Crypto Web API: Failed to decrypt data', desc: $stringifyError(error) });
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
