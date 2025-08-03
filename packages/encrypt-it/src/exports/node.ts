import { Buffer } from 'node:buffer';
import nodeCrypto from 'node:crypto';
import { $err, $ok, $stringifyError, type Result } from '~/error';
import { $isPlainObject, $isString, type NodeKey } from '~/types';
import { ENCODE_FORMAT, NODE_ALGORITHM } from './index';

export type { NodeKey } from '~/types';

const nodeRegex = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.$/;

export function newUuid(): Result<string> {
  try {
    return $ok(nodeCrypto.randomUUID());
  } catch (error) {
    return $err({ message: 'Failed to generate UUID with Crypto NodeJS', description: $stringifyError(error) });
  }
}

export function hash(data: string): Result<string> {
  if (!$isString(data)) {
    return $err({ message: 'Empty data for hashing', description: 'Data must be a non-empty string' });
  }

  try {
    const hashed = nodeCrypto.createHash('sha256').update(data).digest();
    return $ok(hashed.toString(ENCODE_FORMAT));
  } catch (error) {
    return $err({ message: 'Failed to hash data with Crypto NodeJS', description: $stringifyError(error) });
  }
}

export function newSecretKey(key: string | NodeKey): Result<{ secretKey: NodeKey }> {
  if (typeof key === 'string') {
    if (!$isString(key)) return $err({ message: 'Empty key for Crypto NodeJS', description: 'Invalid secret key' });

    try {
      const hashedKey = nodeCrypto.createHash('sha256').update(key).digest();
      const secretKey = nodeCrypto.createSecretKey(hashedKey);

      return $ok({ secretKey });
    } catch (error) {
      return $err({ message: 'Failed to create secret key with Crypto NodeJS', description: $stringifyError(error) });
    }
  }

  if (!$isPlainObject(key)) return $err({ message: 'Invalid secret key', description: 'Expected a crypto.KeyObject' });
  return $ok({ secretKey: key });
}

export function encrypt(data: string, secretKey: NodeKey): Result<string> {
  if (!$isString(data)) {
    return $err({ message: 'Empty data for encryption', description: 'Data must be a non-empty string' });
  }

  if (!$isPlainObject(secretKey)) {
    return $err({ message: 'Invalid encryption key', description: 'Expected a crypto.KeyObject' });
  }

  try {
    const iv = nodeCrypto.randomBytes(12);
    const cipher = nodeCrypto.createCipheriv(NODE_ALGORITHM, secretKey, iv);
    const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return $ok(`${iv.toString(ENCODE_FORMAT)}.${encrypted.toString(ENCODE_FORMAT)}.${tag.toString(ENCODE_FORMAT)}.`);
  } catch (error) {
    return $err({ message: 'Failed to encrypt data with Crypto NodeJS', description: $stringifyError(error) });
  }
}

export function decrypt(encrypted: string, secretKey: NodeKey): Result<string> {
  if (nodeRegex.test(encrypted) === false) {
    return $err({
      message: 'Invalid encrypted data format',
      description: 'Encrypted data must be in the format "iv.encrypted.tag."',
    });
  }

  const [iv, encryptedData, tag] = encrypted.split('.', 4);
  if (!$isString(iv) || !$isString(encryptedData) || !$isString(tag)) {
    return $err({
      message: 'Invalid parameters for decryption',
      description: 'IV, encrypted data, and tag must be non-empty strings',
    });
  }

  if (!$isPlainObject(secretKey)) {
    return $err({ message: 'Invalid decryption key', description: 'Expected a crypto.KeyObject' });
  }

  try {
    const decipher = nodeCrypto.createDecipheriv(NODE_ALGORITHM, secretKey, Buffer.from(iv, ENCODE_FORMAT));
    decipher.setAuthTag(Buffer.from(tag, ENCODE_FORMAT));

    const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedData, ENCODE_FORMAT)), decipher.final()]);
    return $ok(decrypted.toString('utf8'));
  } catch (error) {
    return $err({ message: 'Failed to decrypt data with Crypto NodeJS', description: $stringifyError(error) });
  }
}
