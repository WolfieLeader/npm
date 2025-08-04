import { describe, expect, test } from 'vitest';
import { decode, decrypt, encode, encrypt, newSecretKey, type WebApiKey } from '~/web';

describe('Web API Crypto - AES-256-GCM', () => {
  const secret = 'Secret0123456789Secret0123456789';
  const data = '🦊 secret stuff ~ !@#$%^&*()_+';
  let secretKey: WebApiKey;

  test('Encode and decode data', () => {
    const { bytes: encoded, error: encodeError } = encode(data, 'utf8');
    expect(encodeError).toBeUndefined();
    expect(encoded).toBeInstanceOf(Uint8Array);

    const { result: decoded, error: decodeError } = decode(encoded as Uint8Array, 'utf8');
    expect(decodeError).toBeUndefined();
    expect(decoded).toBe(data);
  });

  test('Create secret key from string', async () => {
    const res = await newSecretKey(secret);
    expect(res.success).toBe(true);
    expect(res.secretKey).toBeDefined();
    secretKey = res.secretKey as WebApiKey;
  });

  test('Encrypt and decrypt data', async () => {
    const encrypted = await encrypt(data, secretKey);
    expect(encrypted.success).toBe(true);
    expect(encrypted.result).toBeDefined();

    const decrypted = await decrypt(encrypted.result as string, secretKey);
    expect(decrypted.success).toBe(true);
    expect(decrypted.result).toBe(data);
  });
});
