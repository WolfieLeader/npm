import { DIGEST_ALGORITHMS, ENCRYPTION_ALGORITHMS, PASSWORD_HASHING } from '~/helpers/consts';
import { $err, $fmtError, $ok, type Result } from '~/helpers/error';
import { $parseToObj, $stringifyObj } from '~/helpers/object';
import type { WebSecretKey } from '~/helpers/types';
import { $isStr, isWebSecretKey, matchPattern } from '~/helpers/validate';
import { $convertBytesToStr, $convertStrToBytes, textEncoder } from './web-encode';

export function $generateUuid(): Result<string> {
  try {
    return $ok(crypto.randomUUID());
  } catch (error) {
    return $err({ msg: 'Crypto Web API - UUID Generation: Failed to generate UUID', desc: $fmtError(error) });
  }
}

export async function $createSecretKey(key: string): Promise<Result<{ result: WebSecretKey }>> {
  if (!$isStr(key)) {
    return $err({ msg: 'Crypto Web API - Key Generation: Empty key', desc: 'Key must be a non-empty string' });
  }

  try {
    const secretKey = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: DIGEST_ALGORITHMS.sha256.web,
        salt: textEncoder.encode('cipher-kit-salt'),
        info: textEncoder.encode('cipher-kit'),
      },
      await crypto.subtle.importKey('raw', textEncoder.encode(key.normalize('NFKC')), 'HKDF', false, ['deriveKey']),
      { name: ENCRYPTION_ALGORITHMS.aes256gcm.web, length: ENCRYPTION_ALGORITHMS.aes256gcm.keyBytes * 8 },
      true,
      ['encrypt', 'decrypt'],
    );

    return $ok({ result: secretKey as WebSecretKey });
  } catch (error) {
    return $err({
      msg: 'Crypto Web API - Key Generation: Failed to create secret key',
      desc: $fmtError(error),
    });
  }
}

export async function $encrypt(data: string, secretKey: WebSecretKey): Promise<Result<string>> {
  if (!$isStr(data)) {
    return $err({
      msg: 'Crypto Web API - Encryption: Empty data for encryption',
      desc: 'Data must be a non-empty string',
    });
  }

  if (!isWebSecretKey(secretKey)) {
    return $err({
      msg: 'Crypto Web API - Encryption: Invalid encryption key',
      desc: 'Expected a WebApiKey (webcrypto.CryptoKey)',
    });
  }

  const bytes = $convertStrToBytes(data, 'utf8');
  if (bytes.error) return $err(bytes.error);

  try {
    const iv = crypto.getRandomValues(new Uint8Array(ENCRYPTION_ALGORITHMS.aes256gcm.ivLength));
    const cipherWithTag = await crypto.subtle.encrypt(
      { name: ENCRYPTION_ALGORITHMS.aes256gcm.web, iv: iv },
      secretKey,
      bytes.result,
    );

    const ivStr = $convertBytesToStr(iv, 'base64url');
    const cipherStr = $convertBytesToStr(cipherWithTag, 'base64url');

    if (ivStr.error || cipherStr.error) {
      return $err({
        msg: 'Crypto Web API - Encryption: Failed to convert IV or encrypted data',
        desc: `Conversion error: ${ivStr.error || cipherStr.error}`,
      });
    }

    return $ok(`${ivStr.result}.${cipherStr.result}.`);
  } catch (error) {
    return $err({ msg: 'Crypto Web API - Encryption: Failed to encrypt data', desc: $fmtError(error) });
  }
}

export async function $decrypt(encrypted: string, secretKey: WebSecretKey): Promise<Result<string>> {
  if (matchPattern(encrypted, 'web') === false) {
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

  if (!isWebSecretKey(secretKey)) {
    return $err({
      msg: 'Crypto Web API - Decryption: Invalid decryption key',
      desc: 'Expected a WebApiKey (webcrypto.CryptoKey)',
    });
  }

  const ivBytes = $convertStrToBytes(iv, 'base64url');
  const cipherWithTagBytes = $convertStrToBytes(encryptedWithTag, 'base64url');

  if (ivBytes.error || cipherWithTagBytes.error) {
    return $err({
      msg: 'Crypto Web API - Decryption: Failed to convert IV or encrypted data',
      desc: `Conversion error: ${ivBytes.error || cipherWithTagBytes.error}`,
    });
  }

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: ENCRYPTION_ALGORITHMS.aes256gcm.web, iv: ivBytes.result },
      secretKey,
      cipherWithTagBytes.result,
    );

    return $convertBytesToStr(decrypted, 'utf8');
  } catch (error) {
    return $err({ msg: 'Crypto Web API - Decryption: Failed to decrypt data', desc: $fmtError(error) });
  }
}

export async function $encryptObj<T extends object = Record<string, unknown>>(
  data: T,
  secretKey: WebSecretKey,
): Promise<Result<string>> {
  const { result, error } = $stringifyObj(data);
  if (error) return $err(error);
  return await $encrypt(result, secretKey);
}

export async function $decryptObj<T extends object = Record<string, unknown>>(
  encrypted: string,
  secretKey: WebSecretKey,
): Promise<Result<{ result: T }>> {
  const { result, error } = await $decrypt(encrypted, secretKey);
  if (error) return $err(error);
  return $parseToObj<T>(result);
}

export async function $hash(data: string): Promise<Result<string>> {
  if (!$isStr(data, 0)) {
    return $err({ msg: 'Crypto Web API - Hashing: Empty data for hashing', desc: 'Data must be a non-empty string' });
  }

  const bytes = $convertStrToBytes(data, 'utf8');
  if (bytes.error) return $err(bytes.error);

  try {
    const hashed = await crypto.subtle.digest(DIGEST_ALGORITHMS.sha256.web, bytes.result);
    return $convertBytesToStr(hashed, 'base64url');
  } catch (error) {
    return $err({ msg: 'Crypto Web API - Hashing: Failed to hash data', desc: $fmtError(error) });
  }
}

export async function $hashPassword(password: string): Promise<Result<{ hash: string; salt: string }>> {
  if (!$isStr(password)) {
    return $err({
      msg: 'Crypto Web API - Password Hashing: Empty password',
      desc: 'Password must be a non-empty string',
    });
  }

  try {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const baseKey = await crypto.subtle.importKey(
      'raw',
      textEncoder.encode(password.normalize('NFKC')),
      'PBKDF2',
      false,
      ['deriveBits'],
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: PASSWORD_HASHING.pbkdf2.iterations, hash: DIGEST_ALGORITHMS.sha512.web },
      baseKey,
      PASSWORD_HASHING.pbkdf2.keyLength * 8,
    );

    const saltStr = $convertBytesToStr(salt, 'base64url');
    if (saltStr.error) return $err(saltStr.error);

    const hashedPasswordStr = $convertBytesToStr(bits, 'base64url');
    if (hashedPasswordStr.error) return $err(hashedPasswordStr.error);

    return $ok({ hash: hashedPasswordStr.result, salt: saltStr.result });
  } catch (error) {
    return $err({ msg: 'Crypto Web API - Password Hashing: Failed to hash password', desc: $fmtError(error) });
  }
}

export async function $verifyPassword(password: string, hashedPassword: string, salt: string): Promise<boolean> {
  if (!$isStr(password) || !$isStr(hashedPassword) || !$isStr(salt)) return false;

  const saltBytes = $convertStrToBytes(salt, 'base64url');
  if (saltBytes.error) return false;

  const { result: hashedPasswordBytes, error: hashedPasswordError } = $convertStrToBytes(hashedPassword, 'base64url');
  if (hashedPasswordError) return false;

  try {
    const baseKey = await crypto.subtle.importKey(
      'raw',
      textEncoder.encode(password.normalize('NFKC')),
      'PBKDF2',
      false,
      ['deriveBits'],
    );

    const bits = new Uint8Array(
      await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: saltBytes.result,
          iterations: PASSWORD_HASHING.pbkdf2.iterations,
          hash: DIGEST_ALGORITHMS.sha512.web,
        },
        baseKey,
        PASSWORD_HASHING.pbkdf2.keyLength * 8,
      ),
    );

    if (bits.length !== hashedPasswordBytes.length) return false;

    let isMatch = true;
    for (let i = 0; i < bits.length; i++) {
      if (bits[i] !== hashedPasswordBytes[i]) isMatch = false;
    }

    return isMatch;
  } catch {
    return false;
  }
}
