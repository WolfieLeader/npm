import { Buffer } from 'node:buffer';
import nodeCrypto from 'node:crypto';
import { $err, $fmtError, $ok, type Result } from '~/error';
import type { NodeKey } from '~/types';
import { $isStr, CONFIG, checkFormat, isNodeKey, tryParseToObj, tryStringifyObj } from '~/utils';
import { $convertBytesToStr, $convertStrToBytes } from './node-encode';

export function $generateUuid(): Result<string> {
  try {
    return $ok(nodeCrypto.randomUUID());
  } catch (error) {
    return $err({ msg: 'Crypto NodeJS API - UUID Generation: Failed to generate UUID', desc: $fmtError(error) });
  }
}

export function $createSecretKey(key: string): Result<{ result: NodeKey }> {
  if (!$isStr(key)) {
    return $err({ msg: 'Crypto NodeJS API - Key Generation: Empty key', desc: 'Key must be a non-empty string' });
  }

  try {
    const hashedKey = nodeCrypto.createHash(CONFIG.hash.sha256.node).update(key).digest();
    const secretKey = nodeCrypto.createSecretKey(hashedKey);
    return $ok({ result: secretKey });
  } catch (error) {
    return $err({ msg: 'Crypto NodeJS API - Key Generation: Failed to create secret key', desc: $fmtError(error) });
  }
}

export function $encrypt(data: string, secretKey: NodeKey): Result<string> {
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

    const ivStr = $convertBytesToStr(iv, 'base64url');
    const cipherStr = $convertBytesToStr(encrypted, 'base64url');
    const tagStr = $convertBytesToStr(tag, 'base64url');

    if (ivStr.error || cipherStr.error || tagStr.error) {
      return $err({
        msg: 'Crypto NodeJS API - Encryption: Failed to convert IV or encrypted data or tag',
        desc: `Conversion error: ${ivStr.error || cipherStr.error || tagStr.error}`,
      });
    }

    return $ok(`${ivStr.result}.${cipherStr.result}.${tagStr.result}.`);
  } catch (error) {
    return $err({ msg: 'Crypto NodeJS API - Encryption: Failed to encrypt data', desc: $fmtError(error) });
  }
}

export function $decrypt(encrypted: string, secretKey: NodeKey): Result<string> {
  if (checkFormat(encrypted, 'node') === false) {
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

  const ivBytes = $convertStrToBytes(iv, 'base64url');
  const cipherBytes = $convertStrToBytes(cipher, 'base64url');
  const tagBytes = $convertStrToBytes(tag, 'base64url');

  if (ivBytes.error || cipherBytes.error || tagBytes.error) {
    return $err({
      msg: 'Crypto NodeJS API - Decryption: Failed to convert IV or encrypted data or tag',
      desc: `Conversion error: ${ivBytes.error || cipherBytes.error || tagBytes.error}`,
    });
  }

  try {
    const decipher = nodeCrypto.createDecipheriv(CONFIG.encrypt.aes256gcm.node, secretKey, ivBytes.result);
    decipher.setAuthTag(tagBytes.result);
    const decrypted = Buffer.concat([decipher.update(cipherBytes.result), decipher.final()]);

    return $convertBytesToStr(decrypted, 'utf8');
  } catch (error) {
    return $err({ msg: 'Crypto NodeJS API - Decryption: Failed to decrypt data', desc: $fmtError(error) });
  }
}
export function $encryptObj<T extends object = Record<string, unknown>>(data: T, secretKey: NodeKey): Result<string> {
  const { result, error } = tryStringifyObj(data);
  if (error) return $err(error);
  return $encrypt(result, secretKey);
}

export function $decryptObj<T extends object = Record<string, unknown>>(
  encrypted: string,
  secretKey: NodeKey,
): Result<{ result: T }> {
  const { result, error } = $decrypt(encrypted, secretKey);
  if (error) return $err(error);
  return tryParseToObj<T>(result);
}

export function $hash(data: string): Result<string> {
  if (!$isStr(data, 0)) {
    return $err({
      msg: 'Crypto NodeJS API - Hashing: Empty data for hashing',
      desc: 'Data must be a non-empty string',
    });
  }

  try {
    const hashed = nodeCrypto.createHash(CONFIG.hash.sha256.node).update(data).digest();
    return $convertBytesToStr(hashed, 'base64url');
  } catch (error) {
    return $err({ msg: 'Crypto NodeJS API - Hashing: Failed to hash data with Crypto NodeJS', desc: $fmtError(error) });
  }
}

export function $hashPassword(password: string): Result<{ hash: string; salt: string }> {
  if (!$isStr(password)) {
    return $err({
      msg: 'Crypto NodeJS API - Password Hashing: Empty password for hashing',
      desc: 'Password must be a non-empty string',
    });
  }

  try {
    const salt = nodeCrypto.randomBytes(CONFIG.password.pbkdf2.saltLength).toString('base64url');
    const hash = nodeCrypto
      .pbkdf2Sync(
        password.normalize('NFKC'),
        salt,
        CONFIG.password.pbkdf2.iterations,
        CONFIG.password.pbkdf2.keyLength,
        CONFIG.hash.sha512.node,
      )
      .toString('base64url');

    return $ok({ salt, hash });
  } catch (error) {
    return $err({ msg: 'Crypto NodeJS API - Password Hashing: Failed to hash password', desc: $fmtError(error) });
  }
}

export function $verifyPassword(password: string, hashedPassword: string, salt: string): boolean {
  if (!$isStr(password) || !$isStr(hashedPassword) || !$isStr(salt)) return false;

  const saltBytes = $convertStrToBytes(salt, 'base64url');
  if (saltBytes.error) return false;

  const hashedPasswordBytes = $convertStrToBytes(hashedPassword, 'base64url');
  if (hashedPasswordBytes.error) return false;

  try {
    return nodeCrypto.timingSafeEqual(
      nodeCrypto.pbkdf2Sync(
        password.normalize('NFKC'),
        saltBytes.result,
        CONFIG.password.pbkdf2.iterations,
        CONFIG.password.pbkdf2.keyLength,
        CONFIG.hash.sha512.node,
      ),
      hashedPasswordBytes.result,
    );
  } catch {
    return false;
  }
}
