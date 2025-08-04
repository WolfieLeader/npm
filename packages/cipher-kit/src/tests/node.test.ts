import { describe, expect, test } from 'vitest';
import { decode, decrypt, encode, encrypt, type NodeKey, newSecretKey } from '~/node';

describe('Node Crypto - AES-256-GCM', () => {
  const secret = 'Secret0123456789Secret0123456789';
  const data = '🦊 secret stuff ~ !@#$%^&*()_+';
  let secretKey: NodeKey;

  test('Encode and decode data', () => {
    const { bytes: encoded, error: encodeError } = encode(data, 'utf8');
    expect(encodeError).toBeUndefined();
    expect(encoded).toBeInstanceOf(Buffer);

    const { result: decoded, error: decodeError } = decode(encoded as Buffer, 'utf8');
    expect(decodeError).toBeUndefined();
    expect(decoded).toBe(data);
  });

  test('Create secret key from string', () => {
    const res = newSecretKey(secret);
    expect(res.success).toBe(true);
    expect(res.secretKey).toBeDefined();
    secretKey = res.secretKey as NodeKey;
  });

  test('Encrypt and decrypt data', () => {
    const encrypted = encrypt(data, secretKey);
    expect(encrypted.success).toBe(true);
    expect(encrypted.result).toBeDefined();

    const decrypted = decrypt(encrypted.result as string, secretKey);
    expect(decrypted.success).toBe(true);
    expect(decrypted.result).toBe(data);
  });
});
