import { describe, expect, test } from 'vitest';
import { tryCreateSecretKey, tryDecrypt, tryDecryptObj, tryEncrypt, tryEncryptObj, type WebApiKey } from '~/web/export';

describe('Web API Crypto - AES-256-GCM', () => {
  const secret = 'Secret0123456789Secret0123456789';
  const data = '🦊 secret stuff ~ !@#$%^&*()_+';
  let secretKey: WebApiKey;

  test('Create secret key from string', async () => {
    const key = await tryCreateSecretKey(secret);
    expect(key.success).toBe(true);
    expect(key.result).toBeDefined();
    secretKey = key.result as WebApiKey;
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
});
