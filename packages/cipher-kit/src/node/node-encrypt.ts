import { Buffer } from 'node:buffer';
import nodeCrypto from 'node:crypto';
import { $err, $fmtError, $fmtResultErr, $ok, type Result } from '~/error';
import type { NodeKey } from '~/types';
import { $isStr, isInNodeEncryptedFormat, isNodeKey, NODE_ALGORITHM, parseToObj, stringifyObj } from '~/utils';
import { tryBytesToString, tryStringToBytes } from './node-encode';

export function generateUuid(): string {
  const { result, error } = tryGenerateUuid();
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

export function hash(data: string): string {
  const { result, error } = tryHash(data);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

export function createSecretKey(key: string): NodeKey {
  const { secretKey, error } = tryCreateSecretKey(key);
  if (error) throw new Error($fmtResultErr(error));
  return secretKey;
}

export function encrypt(data: string, secretKey: NodeKey): string {
  const { result, error } = tryEncrypt(data, secretKey);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

export function decrypt(encrypted: string, secretKey: NodeKey): string {
  const { result, error } = tryDecrypt(encrypted, secretKey);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

export function encryptObj<T extends object = Record<string, unknown>>(data: T, secretKey: NodeKey): string {
  const { result, error } = tryEncryptObj(data, secretKey);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

export function decryptObj<T extends object = Record<string, unknown>>(
  encrypted: string,
  secretKey: NodeKey,
): { result: T } {
  const { result, error } = tryDecryptObj<T>(encrypted, secretKey);
  if (error) throw new Error($fmtResultErr(error));
  return { result };
}

// ----------------------------------------------------------------

export function tryGenerateUuid(): Result<string> {
  try {
    return $ok(nodeCrypto.randomUUID());
  } catch (error) {
    return $err({ msg: 'Crypto NodeJS API - UUID Generation: Failed to generate UUID', desc: $fmtError(error) });
  }
}

export function tryHash(data: string): Result<string> {
  if (!$isStr(data, 0)) {
    return $err({
      msg: 'Crypto NodeJS API - Hashing: Empty data for hashing',
      desc: 'Data must be a non-empty string',
    });
  }

  try {
    const hashed = nodeCrypto.createHash('sha256').update(data).digest();
    return tryBytesToString(hashed, 'base64url');
  } catch (error) {
    return $err({ msg: 'Crypto NodeJS API - Hashing: Failed to hash data with Crypto NodeJS', desc: $fmtError(error) });
  }
}

export function tryCreateSecretKey(key: string): Result<{ secretKey: NodeKey }> {
  if (!$isStr(key)) {
    return $err({ msg: 'Crypto NodeJS API - Key Generation: Empty key', desc: 'Key must be a non-empty string' });
  }

  try {
    const hashedKey = nodeCrypto.createHash('sha256').update(key).digest();
    const secretKey = nodeCrypto.createSecretKey(hashedKey);
    return $ok({ secretKey });
  } catch (error) {
    return $err({ msg: 'Crypto NodeJS API - Key Generation: Failed to create secret key', desc: $fmtError(error) });
  }
}

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
    const iv = nodeCrypto.randomBytes(12);
    const cipher = nodeCrypto.createCipheriv(NODE_ALGORITHM, secretKey, iv);
    const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    const { result: ivString, error: ivError } = tryBytesToString(iv, 'base64url');
    const { result: encryptedString, error: encryptedError } = tryBytesToString(encrypted, 'base64url');
    const { result: tagString, error: tagError } = tryBytesToString(tag, 'base64url');

    if (ivError || encryptedError || tagError) {
      return $err({
        msg: 'Crypto NodeJS API - Encryption: Failed to convert IV or encrypted data or tag',
        desc: `Conversion error: ${ivError || encryptedError || tagError}`,
      });
    }

    return $ok(`${ivString}.${encryptedString}.${tagString}.`);
  } catch (error) {
    return $err({ msg: 'Crypto NodeJS API - Encryption: Failed to encrypt data', desc: $fmtError(error) });
  }
}

export function tryDecrypt(encrypted: string, secretKey: NodeKey): Result<string> {
  if (isInNodeEncryptedFormat(encrypted) === false) {
    return $err({
      msg: 'Crypto NodeJS API - Decryption: Invalid encrypted data format',
      desc: 'Encrypted data must be in the format "iv.encryptedData.tag."',
    });
  }

  const [iv, encryptedData, tag] = encrypted.split('.', 4);
  if (!$isStr(iv) || !$isStr(encryptedData) || !$isStr(tag)) {
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
  const { bytes: encryptedBytes, error: encryptedError } = tryStringToBytes(encryptedData, 'base64url');
  const { bytes: tagBytes, error: tagError } = tryStringToBytes(tag, 'base64url');

  if (ivError || encryptedError || tagError) {
    return $err({
      msg: 'Crypto NodeJS API - Decryption: Failed to convert IV or encrypted data or tag',
      desc: `Conversion error: ${ivError || encryptedError || tagError}`,
    });
  }

  try {
    const decipher = nodeCrypto.createDecipheriv(NODE_ALGORITHM, secretKey, ivBytes);
    decipher.setAuthTag(tagBytes);

    const decrypted = Buffer.concat([decipher.update(encryptedBytes), decipher.final()]);
    return tryBytesToString(decrypted, 'utf8');
  } catch (error) {
    return $err({ msg: 'Crypto NodeJS API - Decryption: Failed to decrypt data', desc: $fmtError(error) });
  }
}

export function tryEncryptObj<T extends object = Record<string, unknown>>(data: T, secretKey: NodeKey): Result<string> {
  const { result, error } = stringifyObj(data);
  if (error) return $err(error);
  return tryEncrypt(result, secretKey);
}

export function tryDecryptObj<T extends object = Record<string, unknown>>(
  encrypted: string,
  secretKey: NodeKey,
): Result<{ result: T }> {
  const { result, error } = tryDecrypt(encrypted, secretKey);
  if (error) return $err(error);
  return parseToObj<T>(result);
}
