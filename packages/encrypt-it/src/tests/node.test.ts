import { describe, expect, test } from 'vitest';
import { decode, decrypt, encode, encrypt, type NodeKey, newSecretKey } from '~/node';

describe('Node Crypto - AES-256-GCM', () => {
  const secret = 'Secret0123456789Secret0123456789';
  const data = '🦊 secret stuff ~ !@#$%^&*()_+';
  let secretKey: NodeKey;

  test('Encode and decode data', () => {
    const encoded = encode(data, 'utf8');
    expect(encoded).toBeInstanceOf(Buffer);

    const decoded = decode(encoded, 'utf8');
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
