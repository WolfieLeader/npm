import { Buffer } from 'node:buffer';
import nodeCrypto from 'node:crypto';
import { $err, $ok, $stringifyError, type Result } from '~/error';
import type { NodeKey } from '~/types';
import { $isStr, isInNodeEncryptionFormat, isNodeKey, NODE_ALGORITHM, parseToObj, stringifyObj } from '~/utils';
import { decode, encode } from './encode';

export function generateUuid(): Result<string> {
  try {
    return $ok(nodeCrypto.randomUUID());
  } catch (error) {
    return $err({ msg: 'Crypto NodeJS: Failed to generate UUID', desc: $stringifyError(error) });
  }
}

export function hash(data: string): Result<string> {
  if (!$isStr(data, 0)) {
    return $err({ msg: 'Crypto NodeJS: Empty data for hashing', desc: 'Data must be a non-empty string' });
  }

  try {
    const hashed = nodeCrypto.createHash('sha256').update(data).digest();
    return decode(hashed, 'base64url');
  } catch (error) {
    return $err({ msg: 'Crypto NodeJS: Failed to hash data with Crypto NodeJS', desc: $stringifyError(error) });
  }
}

export function createSecretKey(key: string | NodeKey): Result<{ secretKey: NodeKey }> {
  if (typeof key === 'string') {
    try {
      if (!$isStr(key)) return $err({ msg: 'Crypto NodeJS: Empty key', desc: 'Key must be a non-empty string' });
      const hashedKey = nodeCrypto.createHash('sha256').update(key).digest();
      const secretKey = nodeCrypto.createSecretKey(hashedKey);
      return $ok({ secretKey });
    } catch (error) {
      return $err({ msg: 'Crypto NodeJS: Failed to create secret key', desc: $stringifyError(error) });
    }
  }

  if (!isNodeKey(key)) {
    return $err({ msg: 'Crypto NodeJS: Invalid secret key', desc: 'Expected a NodeKey(crypto.KeyObject)' });
  }

  return $ok({ secretKey: key });
}

export function encrypt(data: string, secretKey: NodeKey): Result<string> {
  try {
    if (!$isStr(data)) {
      return $err({ msg: 'Crypto NodeJS: Empty data for encryption', desc: 'Data must be a non-empty string' });
    }

    if (!isNodeKey(secretKey)) {
      return $err({ msg: 'Crypto NodeJS: Invalid encryption key', desc: 'Expected a NodeKey(crypto.KeyObject)' });
    }

    const iv = nodeCrypto.randomBytes(12);
    const cipher = nodeCrypto.createCipheriv(NODE_ALGORITHM, secretKey, iv);
    const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    const { result: decodedIv, error: ivError } = decode(iv, 'base64url');
    const { result: decodedEncrypted, error: encryptedError } = decode(encrypted, 'base64url');
    const { result: decodedTag, error: tagError } = decode(tag, 'base64url');
    if (ivError || encryptedError || tagError) {
      return $err({
        msg: 'Crypto NodeJS: Failed to convert IV or encrypted data or tag',
        desc: `Conversion error: ${ivError || encryptedError || tagError}`,
      });
    }

    return $ok(`${decodedIv}.${decodedEncrypted}.${decodedTag}.`);
  } catch (error) {
    return $err({ msg: 'Crypto NodeJS: Failed to encrypt data', desc: $stringifyError(error) });
  }
}

export function decrypt(encrypted: string, secretKey: NodeKey): Result<string> {
  if (isInNodeEncryptionFormat(encrypted) === false) {
    return $err({
      msg: 'Crypto NodeJS: Invalid encrypted data format',
      desc: 'Encrypted data must be in the format "iv.encryptedData.tag."',
    });
  }

  const [iv, encryptedData, tag] = encrypted.split('.', 4);
  if (!$isStr(iv) || !$isStr(encryptedData) || !$isStr(tag)) {
    return $err({
      msg: 'Crypto NodeJS: Invalid encrypted data',
      desc: 'Encrypted data must contain valid IV, encrypted data, and tag components',
    });
  }

  if (!isNodeKey(secretKey)) {
    return $err({ msg: 'Crypto NodeJS: Invalid decryption key', desc: 'Expected a crypto.KeyObject' });
  }

  const { bytes: ivBytes, error: ivError } = encode(iv, 'base64url');
  const { bytes: encryptedBytes, error: encryptedError } = encode(encryptedData, 'base64url');
  const { bytes: tagBytes, error: tagError } = encode(tag, 'base64url');
  if (ivError || encryptedError || tagError) {
    return $err({
      msg: 'Crypto NodeJS: Failed to convert IV or encrypted data or tag',
      desc: `Conversion error: ${ivError || encryptedError || tagError}`,
    });
  }

  try {
    const decipher = nodeCrypto.createDecipheriv(NODE_ALGORITHM, secretKey, ivBytes);
    decipher.setAuthTag(tagBytes);

    const decrypted = Buffer.concat([decipher.update(encryptedBytes), decipher.final()]);
    return decode(decrypted, 'utf8');
  } catch (error) {
    return $err({ msg: 'Crypto NodeJS: Failed to decrypt data', desc: $stringifyError(error) });
  }
}

export function encryptObj(data: Record<string, unknown>, secretKey: NodeKey): Result<string> {
  const { result, error } = stringifyObj(data);
  if (error) return $err(error);
  return encrypt(result, secretKey);
}

export function decryptObj(encrypted: string, secretKey: NodeKey): Result<{ result: Record<string, unknown> }> {
  const { result, error } = decrypt(encrypted, secretKey);
  if (error) return $err(error);
  return parseToObj(result);
}
