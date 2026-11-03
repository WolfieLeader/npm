import * as fc from "fast-check";
import { expect } from "vitest";
import type { CipherEncoding } from "~/helpers/types.js";

// Any code point, without lone surrogates, with half the characters drawn from known edge cases.
const edgeChar = fc.constantFrom("\uFEFF", "\u0000", "\uFFFD", "\u{10FFFF}", " ", ".", "\r\n");
export const anyText: fc.Arbitrary<string> = fc.string({
  unit: fc.oneof(fc.string({ unit: "binary", minLength: 1, maxLength: 1 }), edgeChar),
});

export const secret = "Secret0123456789Secret0123456789";
export const data = "🦊 secret stuff ~ !@#$%^&*()_+";
export const repeated: string = "Hēl!0, ".repeat(1000).trim();

export interface SmallObj {
  name: string;
  age: number;
  isAdmin: boolean;
}

export interface LargeObj {
  user: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    preferences: {
      theme: string;
      language: string;
      notifications: { email: boolean; sms: boolean; push: boolean };
    };
    roles: string[];
    stats: { posts: number; comments: number; likes: number; lastLogin: string };
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
      geo: { lat: number; lng: number };
    };
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    tags: string[];
    notes: { id: string; title: string; content: string; pinned: boolean }[];
  };
  config: {
    features: {
      featureA: boolean;
      featureB: boolean;
      featureC: boolean;
      experimental: { newUI: boolean; searchV2: boolean };
    };
    limits: { maxItems: number; timeout: number; retries: number };
  };
  session: { token: string; expiresIn: number; refreshToken: string };
  logs: { timestamp: string; message: string; level: string | undefined }[];
}

export const smallObj: SmallObj = {
  name: "Alice",
  age: 30,
  isAdmin: false,
};

export const largeObj: LargeObj = {
  user: {
    id: "user_1234567890",
    name: "John Doe",
    email: "john.doe@example.com",
    isActive: true,
    preferences: {
      theme: "dark",
      language: "en-US",
      notifications: {
        email: true,
        sms: false,
        push: true,
      },
    },
    roles: ["admin", "editor", "user"],
    stats: {
      posts: 234,
      comments: 876,
      likes: 4321,
      lastLogin: new Date().toISOString(),
    },
    address: {
      street: "1234 Main St",
      city: "Metropolis",
      state: "CA",
      zip: "90210",
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
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    expiresIn: 3600,
    refreshToken: "ref_123456789",
  },
  logs: Array.from({ length: 200 }, (_, i) => ({
    timestamp: new Date(Date.now() - i * 1000).toISOString(),
    message: `Log message number ${i}`,
    level: ["info", "warn", "error"][i % 3],
  })),
};

/** The failed result a `try*` function returns. */
export function failure(
  message: string,
  description: string,
): { success: false; error: { message: string; description: string } } {
  return { success: false, error: { message, description } };
}

/**
 * A failed result whose description comes from the runtime's own error. Its wording differs between Node, Bun,
 * and Deno, so only the message is pinned.
 */
export function runtimeFailure(message: string): { success: false; error: { message: string; description: string } } {
  return failure(message, expect.any(String) as string);
}

/** Deno's `node:crypto` has no AES-192-GCM. Its Web Crypto and every other runtime do. */
export const lacksNodeAes192: boolean = "Deno" in globalThis;

/** `expect.stringMatching(pattern)`, typed as the string it stands in for. */
export function stringMatching(pattern: RegExp): string {
  return expect.stringMatching(pattern) as string;
}

/** `expect.any(type)`, typed as the instance it stands in for. */
export function anyInstance<T>(type: { prototype: T }): T {
  return expect.any(type) as T;
}

/** A pattern for `bytes` random or derived bytes written in `encoding`, such as a salt or a password hash. */
function encodedSegment(bytes: number, encoding: CipherEncoding = "base64url"): string {
  if (encoding === "hex") return `[0-9a-f]{${bytes * 2}}`;

  const chars = Math.ceil((bytes * 4) / 3);
  if (encoding === "base64url") return `[A-Za-z0-9_-]{${chars}}`;

  return `[A-Za-z0-9+/]{${chars}}${"=".repeat((3 - (bytes % 3)) % 3)}`;
}

/** Matches a whole encoded value of exactly `bytes` bytes. */
export function encodedPattern(bytes: number, encoding: CipherEncoding = "base64url"): RegExp {
  return new RegExp(`^${encodedSegment(bytes, encoding)}$`);
}

/**
 * Matches `"iv.cipher.tag."` for `plaintext` encrypted with AES-GCM in `encoding`:
 * a 12-byte IV, a ciphertext as long as the UTF-8 plaintext, and a 16-byte auth tag.
 */
export function cipherPattern(plaintext: string, encoding: CipherEncoding = "base64url"): RegExp {
  const length = new TextEncoder().encode(plaintext).byteLength;
  const segments = [12, length, 16].map((bytes) => encodedSegment(bytes, encoding));

  return new RegExp(`^${segments.join("\\.")}\\.$`);
}
