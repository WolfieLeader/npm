import { describe, expect, test } from 'vitest';
import { compress, compressObj, decompress, decompressObj } from '~/compress';

describe('Compression Utility', () => {
  const emojiStr = '🦊 secret stuff ~ !@#$%^&*()_+';
  const smallObj = { a: 'test', b: 123, c: true };
  const largeObj = {
    user: {
      id: 'user_1234567890',
      name: 'John Doe',
      email: 'john.doe@example.com',
      isActive: true,
      preferences: {
        theme: 'dark',
        language: 'en-US',
        notifications: { email: true, sms: false, push: true },
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

  test('Compress and decompress string', () => {
    const compressed = compress(emojiStr);
    expect(compressed.error).toBeUndefined();
    expect(compressed.success).toBe(true);
    expect(compressed.result).toBeDefined();

    const decompressed = decompress(compressed.result as string);
    expect(decompressed.error).toBeUndefined();
    expect(decompressed.success).toBe(true);
    expect(decompressed.result).toBe(emojiStr);
  });

  test('Decompression fails on invalid format', () => {
    const { success, error } = decompress('not-a-valid-compressed-string');
    expect(success).toBe(false);
    expect(error?.message).toMatch(/Invalid format/);
  });

  test('Compress and decompress small object', () => {
    const compressed = compressObj(smallObj);
    expect(compressed.error).toBeUndefined();
    expect(compressed.success).toBe(true);
    expect(compressed.result).toBeDefined();

    const decompressed = decompressObj(compressed.result as string);
    expect(decompressed.error).toBeUndefined();
    expect(decompressed.success).toBe(true);
    expect(decompressed.result).toEqual(smallObj);
  });

  test('Compress and decompress large object', () => {
    const compressed = compressObj(largeObj);
    expect(compressed.error).toBeUndefined();
    expect(compressed.success).toBe(true);
    expect(compressed.result).toBeDefined();

    const decompressed = decompressObj(compressed.result as string);
    expect(decompressed.error).toBeUndefined();
    expect(decompressed.success).toBe(true);
    expect(decompressed.result).toEqual(largeObj);
  });

  test('Decompress invalid data', () => {
    const decompressed = decompressObj('invalid-compressed-data');
    expect(decompressed.success).toBe(false);
    expect(decompressed.error?.message).toMatch(/Invalid format/);
  });
});
