import { describe, expect, test } from 'vitest';
import {
  convertToFormat,
  tryBytesToString,
  tryCreateSecretKey,
  tryDecrypt,
  tryDecryptObj,
  tryEncrypt,
  tryEncryptObj,
  tryStringToBytes,
  type WebApiKey,
} from '~/web/export';

describe('Web API Crypto - AES-256-GCM', () => {
  const secret = 'Secret0123456789Secret0123456789';
  const data = '🦊 secret stuff ~ !@#$%^&*()_+';
  let secretKey: WebApiKey;

  test('Encode and decode data', () => {
    const { bytes: encoded, error: encodeError } = tryStringToBytes(data, 'utf8');
    expect(encodeError).toBeUndefined();
    expect(encoded).toBeInstanceOf(Uint8Array);

    const { result: decoded, error: decodeError } = tryBytesToString(encoded as Uint8Array<ArrayBuffer>, 'utf8');
    expect(decodeError).toBeUndefined();
    expect(decoded).toBe(data);
  });

  test('Create secret key from string', async () => {
    const res = await tryCreateSecretKey(secret);
    expect(res.success).toBe(true);
    expect(res.secretKey).toBeDefined();
    secretKey = res.secretKey as WebApiKey;
  });

  test('Encrypt and decrypt data', async () => {
    const encrypted = await tryEncrypt(data, secretKey);
    expect(encrypted.success).toBe(true);
    expect(encrypted.result).toBeDefined();

    const decrypted = await tryDecrypt(encrypted.result as string, secretKey);
    expect(decrypted.success).toBe(true);
    expect(decrypted.result).toBe(data);
  });

  const largeObj = {
    user: {
      id: 'user_1234567890',
      name: 'John Doe',
      email: 'john.doe@example.com',
      isActive: true,
      preferences: {
        theme: 'dark',
        language: 'en-US',
        notifications: {
          email: true,
          sms: false,
          push: true,
        },
      },
      roles: ['admin', 'editor', 'user'],
      stats: {
        posts: 234,
        comments: 876,
        likes: 4321,
        lastLogin: new Date().toISOString(),
      },
      address: {
        street: '1234 Main St',
        city: 'Metropolis',
        state: 'CA',
        zip: '90210',
        geo: { lat: 34.0522, lng: -118.2437 },
      },
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: Array.from({ length: 100 }, (_, i) => `tag_${i}`),
      notes: Array.from({ length: 50 }, (_, i) => ({
        id: `note_${i}`,
        title: `Note ${i}`,
        content: `This is the content of note number ${i}`,
        pinned: i % 3 === 0,
      })),
    },
    config: {
      features: {
        featureA: true,
        featureB: false,
        featureC: true,
        experimental: { newUI: false, searchV2: true },
      },
      limits: { maxItems: 1000, timeout: 3000, retries: 5 },
    },
    session: {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      expiresIn: 3600,
      refreshToken: 'ref_123456789',
    },
    logs: Array.from({ length: 200 }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 1000).toISOString(),
      message: `Log message number ${i}`,
      level: ['info', 'warn', 'error'][i % 3],
    })),
  };

  test('Encrypt and decrypt object', async () => {
    const encrypted = await tryEncryptObj(largeObj, secretKey);
    expect(encrypted.success).toBe(true);
    expect(encrypted.result).toBeDefined();

    const decrypted = await tryDecryptObj(encrypted.result as string, secretKey);
    expect(decrypted.success).toBe(true);
    expect(decrypted.result).toEqual(largeObj);
  });

  test('Convert', () => {
    const binary = convertToFormat('Héllø 🙂', 'utf8', 'binary');
    console.log('binary:', binary);
    expect(binary).toBeDefined();
  });
});
