import { expect } from "vitest";

export const data = "The quick brown fox (🦊) jumps over the lazy dog (🐶)";
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

/** A deflated payload: base64url bytes followed by the `.1.` marker. */
export const DEFLATED: RegExp = /^[\w-]+\.1\.$/;

/** The payload `compress()` writes when deflate does not shrink `text`: its UTF-8 bytes in base64url, then `.0.`. */
export function stored(text: string): string {
  return `${Buffer.from(text, "utf8").toString("base64url")}.0.`;
}

/** `expect.stringMatching(pattern)`, typed as the string it stands in for. */
export function stringMatching(pattern: RegExp): string {
  return expect.stringMatching(pattern) as string;
}
