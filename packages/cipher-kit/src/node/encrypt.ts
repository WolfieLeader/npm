import { Buffer } from 'node:buffer';
import nodeCrypto from 'node:crypto';
import { $err, $ok, $stringifyError, type Result } from '~/error';
import type { NodeKey } from '~/types';
import { $isStr, $parseToObj, $stringifyObj } from '~/utils';
import { decode, encode } from './encode';
import { $isNodeKey, ENCRYPTED_NODE_REGEX } from './utils';

export const NODE_ALGORITHM = 'aes-256-gcm';

export function hash(data: string): Result<string> {
  if (!$isStr(data)) {
    return $err({ message: 'Empty data for hashing', description: 'Data must be a non-empty string' });
  }

  try {
    const hashed = nodeCrypto.createHash('sha256').update(data).digest();
    return decode(hashed, 'base64url');
  } catch (error) {
    return $err({ message: 'Failed to hash data with Crypto NodeJS', description: $stringifyError(error) });
  }
}

export function newSecretKey(key: string | NodeKey): Result<{ secretKey: NodeKey }> {
  if (typeof key === 'string') {
    if (!$isStr(key, 1)) return $err({ message: 'Empty key for Crypto NodeJS', description: 'Invalid secret key' });

    try {
      const hashedKey = nodeCrypto.createHash('sha256').update(key).digest();
      const secretKey = nodeCrypto.createSecretKey(hashedKey);
      return $ok({ secretKey });
    } catch (error) {
      return $err({ message: 'Failed to create secret key with Crypto NodeJS', description: $stringifyError(error) });
    }
  }

  if (!$isNodeKey(key)) return $err({ message: 'Invalid secret key', description: 'Expected a crypto.KeyObject' });
  return $ok({ secretKey: key });
}

export function encrypt(data: string, secretKey: NodeKey): Result<string> {
  if (!$isStr(data)) {
    return $err({ message: 'Empty data for encryption', description: 'Data must be a non-empty string' });
  }

  if (!$isNodeKey(secretKey)) {
    return $err({ message: 'Invalid encryption key', description: 'Expected a crypto.KeyObject' });
  }

  try {
    const iv = nodeCrypto.randomBytes(12);
    const cipher = nodeCrypto.createCipheriv(NODE_ALGORITHM, secretKey, iv);
    const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    const { result: decodedIv, error: ivError } = decode(iv, 'base64url');
    const { result: decodedEncrypted, error: encryptedError } = decode(encrypted, 'base64url');
    const { result: decodedTag, error: tagError } = decode(tag, 'base64url');
    if (ivError || encryptedError || tagError) {
      return $err({ message: 'Failed to encode encrypted data', description: 'Encoding error' });
    }

    return $ok(`${decodedIv}.${decodedEncrypted}.${decodedTag}.`);
  } catch (error) {
    return $err({ message: 'Failed to encrypt data with Crypto NodeJS', description: $stringifyError(error) });
  }
}

export function decrypt(encrypted: string, secretKey: NodeKey): Result<string> {
  if (ENCRYPTED_NODE_REGEX.test(encrypted) === false) {
    return $err({
      message: 'Invalid encrypted data format',
      description: 'Encrypted data must be in the format "iv.encrypted.tag."',
    });
  }

  const [iv, encryptedData, tag] = encrypted.split('.', 4);
  if (!$isStr(iv, 1) || !$isStr(encryptedData, 1) || !$isStr(tag, 1)) {
    return $err({
      message: 'Invalid parameters for decryption',
      description: 'IV, encrypted data, and tag must be non-empty strings',
    });
  }

  if (!$isNodeKey(secretKey)) {
    return $err({ message: 'Invalid decryption key', description: 'Expected a crypto.KeyObject' });
  }

  const { bytes: ivBytes, error: ivError } = encode(iv, 'base64url');
  const { bytes: encryptedBytes, error: encryptedError } = encode(encryptedData, 'base64url');
  const { bytes: tagBytes, error: tagError } = encode(tag, 'base64url');
  if (ivError || encryptedError || tagError) {
    return $err({ message: 'Failed to encode IV or encrypted data', description: 'Encoding error' });
  }

  try {
    const decipher = nodeCrypto.createDecipheriv(NODE_ALGORITHM, secretKey, ivBytes);
    decipher.setAuthTag(tagBytes);

    const decrypted = Buffer.concat([decipher.update(encryptedBytes), decipher.final()]);
    return decode(decrypted, 'utf8');
  } catch (error) {
    return $err({ message: 'Failed to decrypt data with Crypto NodeJS', description: $stringifyError(error) });
  }
}

export function encryptObj(data: Record<string, unknown>, secretKey: NodeKey): Result<string> {
  const { result, error } = $stringifyObj(data);
  if (error) return $err(error);
  return encrypt(result, secretKey);
}

export function decryptObj(encrypted: string, secretKey: NodeKey): Result<{ result: Record<string, unknown> }> {
  const { result, error } = decrypt(encrypted, secretKey);
  if (error) return $err(error);
  return $parseToObj(result);
}
