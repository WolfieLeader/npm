import { describe, expect, test } from "vitest";
import { matchPattern, nodeKit, type SecretKey, webKit } from "~/export";

const secret = "Secret0123456789Secret0123456789";

const simpleObj = {
  name: "John Doe",
  age: 30,
  active: true,
};

const largeObj = {
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

describe("Object Encryption/Decryption - Success Cases", () => {
  test("Node: Encrypt and decrypt simple object", () => {
    const keyResult = nodeKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"node">;

    const encrypted = nodeKit.tryEncryptObj(simpleObj, key);
    expect(encrypted.success).toBe(true);
    expect(encrypted.result).toBeDefined();
    expect(matchPattern(encrypted.result as string, "node")).toBe(true);

    const decrypted = nodeKit.tryDecryptObj<typeof simpleObj>(encrypted.result as string, key);
    expect(decrypted.success).toBe(true);
    expect(decrypted.result).toEqual(simpleObj);
  });

  test("Web: Encrypt and decrypt simple object", async () => {
    const keyResult = await webKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"web">;

    const encrypted = await webKit.tryEncryptObj(simpleObj, key);
    expect(encrypted.success).toBe(true);
    expect(encrypted.result).toBeDefined();
    expect(matchPattern(encrypted.result as string, "web")).toBe(true);

    const decrypted = await webKit.tryDecryptObj<typeof simpleObj>(encrypted.result as string, key);
    expect(decrypted.success).toBe(true);
    expect(decrypted.result).toEqual(simpleObj);
  });

  test("Node: Encrypt and decrypt large object", () => {
    const keyResult = nodeKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"node">;

    const encrypted = nodeKit.tryEncryptObj(largeObj, key);
    expect(encrypted.success).toBe(true);
    expect(encrypted.result).toBeDefined();

    const decrypted = nodeKit.tryDecryptObj<typeof largeObj>(encrypted.result as string, key);
    expect(decrypted.success).toBe(true);
    expect(decrypted.result).toEqual(largeObj);
  });

  test("Web: Encrypt and decrypt large object", async () => {
    const keyResult = await webKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"web">;

    const encrypted = await webKit.tryEncryptObj(largeObj, key);
    expect(encrypted.success).toBe(true);
    expect(encrypted.result).toBeDefined();

    const decrypted = await webKit.tryDecryptObj<typeof largeObj>(encrypted.result as string, key);
    expect(decrypted.success).toBe(true);
    expect(decrypted.result).toEqual(largeObj);
  });

  test("Node: Encrypt with base64 encoding", () => {
    const keyResult = nodeKit.tryCreateSecretKey(secret, { algorithm: "aes128gcm" });
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"node">;

    const encrypted = nodeKit.tryEncryptObj(simpleObj, key, { encoding: "base64" });
    expect(encrypted.success).toBe(true);

    const decrypted = nodeKit.tryDecryptObj<typeof simpleObj>(encrypted.result as string, key, { encoding: "base64" });
    expect(decrypted.success).toBe(true);
    expect(decrypted.result).toEqual(simpleObj);
  });

  test("Web: Encrypt with base64 encoding", async () => {
    const keyResult = await webKit.tryCreateSecretKey(secret, { algorithm: "aes128gcm" });
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"web">;

    const encrypted = await webKit.tryEncryptObj(simpleObj, key, { encoding: "base64" });
    expect(encrypted.success).toBe(true);

    const decrypted = await webKit.tryDecryptObj<typeof simpleObj>(encrypted.result as string, key, {
      encoding: "base64",
    });
    expect(decrypted.success).toBe(true);
    expect(decrypted.result).toEqual(simpleObj);
  });

  test("Node: Encrypt object with null values", () => {
    const keyResult = nodeKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"node">;

    const objWithNull = { name: "Test", value: null, count: 0 };
    const encrypted = nodeKit.tryEncryptObj(objWithNull, key);
    expect(encrypted.success).toBe(true);

    const decrypted = nodeKit.tryDecryptObj<typeof objWithNull>(encrypted.result as string, key);
    expect(decrypted.success).toBe(true);
    expect(decrypted.result).toEqual(objWithNull);
  });

  test("Web: Encrypt object with null values", async () => {
    const keyResult = await webKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"web">;

    const objWithNull = { name: "Test", value: null, count: 0 };
    const encrypted = await webKit.tryEncryptObj(objWithNull, key);
    expect(encrypted.success).toBe(true);

    const decrypted = await webKit.tryDecryptObj<typeof objWithNull>(encrypted.result as string, key);
    expect(decrypted.success).toBe(true);
    expect(decrypted.result).toEqual(objWithNull);
  });
});

describe("Object Encryption - Error Cases", () => {
  test("Node: Fail with non-object input (string)", () => {
    const keyResult = nodeKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"node">;

    // @ts-expect-error Testing invalid input type
    const encrypted = nodeKit.tryEncryptObj("not an object", key);
    expect(encrypted.success).toBe(false);
    expect(encrypted.error).toBeDefined();
  });

  test("Web: Fail with non-object input (string)", async () => {
    const keyResult = await webKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"web">;

    // @ts-expect-error Testing invalid input type
    const encrypted = await webKit.tryEncryptObj("not an object", key);
    expect(encrypted.success).toBe(false);
    expect(encrypted.error).toBeDefined();
  });

  test("Node: Fail with non-object input (number)", () => {
    const keyResult = nodeKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"node">;

    // @ts-expect-error Testing invalid input type
    const encrypted = nodeKit.tryEncryptObj(12345, key);
    expect(encrypted.success).toBe(false);
    expect(encrypted.error).toBeDefined();
  });

  test("Web: Fail with non-object input (number)", async () => {
    const keyResult = await webKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"web">;

    // @ts-expect-error Testing invalid input type
    const encrypted = await webKit.tryEncryptObj(12345, key);
    expect(encrypted.success).toBe(false);
    expect(encrypted.error).toBeDefined();
  });

  test("Node: Fail with non-object input (null)", () => {
    const keyResult = nodeKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"node">;

    // @ts-expect-error Testing invalid input type
    const encrypted = nodeKit.tryEncryptObj(null, key);
    expect(encrypted.success).toBe(false);
    expect(encrypted.error).toBeDefined();
  });

  test("Web: Fail with non-object input (null)", async () => {
    const keyResult = await webKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"web">;

    // @ts-expect-error Testing invalid input type
    const encrypted = await webKit.tryEncryptObj(null, key);
    expect(encrypted.success).toBe(false);
    expect(encrypted.error).toBeDefined();
  });

  test("Node: Fail with non-object input (array)", () => {
    const keyResult = nodeKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"node">;

    // Arrays are technically objects but should fail the validation
    const encrypted = nodeKit.tryEncryptObj([1, 2, 3] as unknown as Record<string, unknown>, key);
    expect(encrypted.success).toBe(false);
    expect(encrypted.error).toBeDefined();
  });

  test("Web: Fail with non-object input (array)", async () => {
    const keyResult = await webKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"web">;

    // Arrays are technically objects but should fail the validation
    const encrypted = await webKit.tryEncryptObj([1, 2, 3] as unknown as Record<string, unknown>, key);
    expect(encrypted.success).toBe(false);
    expect(encrypted.error).toBeDefined();
  });

  test("Node: Fail with invalid key", () => {
    // @ts-expect-error Testing invalid key type
    const encrypted = nodeKit.tryEncryptObj(simpleObj, null);
    expect(encrypted.success).toBe(false);
    expect(encrypted.error).toBeDefined();
  });

  test("Web: Fail with invalid key", async () => {
    // @ts-expect-error Testing invalid key type
    const encrypted = await webKit.tryEncryptObj(simpleObj, null);
    expect(encrypted.success).toBe(false);
    expect(encrypted.error).toBeDefined();
  });
});

describe("Object Decryption - Error Cases", () => {
  test("Node: Fail with corrupted ciphertext", () => {
    const keyResult = nodeKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"node">;

    const encrypted = nodeKit.tryEncryptObj(simpleObj, key);
    expect(encrypted.success).toBe(true);

    // Corrupt the ciphertext
    const corrupted = (encrypted.result as string).replace(/[a-z]/, "x");

    const decrypted = nodeKit.tryDecryptObj(corrupted, key);
    expect(decrypted.success).toBe(false);
    expect(decrypted.error).toBeDefined();
  });

  test("Web: Fail with corrupted ciphertext", async () => {
    const keyResult = await webKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"web">;

    const encrypted = await webKit.tryEncryptObj(simpleObj, key);
    expect(encrypted.success).toBe(true);

    // Corrupt the ciphertext
    const corrupted = (encrypted.result as string).replace(/[a-z]/, "x");

    const decrypted = await webKit.tryDecryptObj(corrupted, key);
    expect(decrypted.success).toBe(false);
    expect(decrypted.error).toBeDefined();
  });

  test("Node: Fail with wrong key", () => {
    const keyResult1 = nodeKit.tryCreateSecretKey(secret);
    const keyResult2 = nodeKit.tryCreateSecretKey("DifferentSecret123456789012");
    expect(keyResult1.success).toBe(true);
    expect(keyResult2.success).toBe(true);
    const key1 = keyResult1.result as SecretKey<"node">;
    const key2 = keyResult2.result as SecretKey<"node">;

    const encrypted = nodeKit.tryEncryptObj(simpleObj, key1);
    expect(encrypted.success).toBe(true);

    const decrypted = nodeKit.tryDecryptObj(encrypted.result as string, key2);
    expect(decrypted.success).toBe(false);
    expect(decrypted.error).toBeDefined();
  });

  test("Web: Fail with wrong key", async () => {
    const keyResult1 = await webKit.tryCreateSecretKey(secret);
    const keyResult2 = await webKit.tryCreateSecretKey("DifferentSecret123456789012");
    expect(keyResult1.success).toBe(true);
    expect(keyResult2.success).toBe(true);
    const key1 = keyResult1.result as SecretKey<"web">;
    const key2 = keyResult2.result as SecretKey<"web">;

    const encrypted = await webKit.tryEncryptObj(simpleObj, key1);
    expect(encrypted.success).toBe(true);

    const decrypted = await webKit.tryDecryptObj(encrypted.result as string, key2);
    expect(decrypted.success).toBe(false);
    expect(decrypted.error).toBeDefined();
  });

  test("Node: Fail with invalid JSON in decrypted data", () => {
    const keyResult = nodeKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"node">;

    // Encrypt a string that's not valid JSON
    const encrypted = nodeKit.tryEncrypt("not a json string", key);
    expect(encrypted.success).toBe(true);

    // Try to decrypt as object
    const decrypted = nodeKit.tryDecryptObj(encrypted.result as string, key);
    expect(decrypted.success).toBe(false);
    expect(decrypted.error).toBeDefined();
  });

  test("Web: Fail with invalid JSON in decrypted data", async () => {
    const keyResult = await webKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"web">;

    // Encrypt a string that's not valid JSON
    const encrypted = await webKit.tryEncrypt("not a json string", key);
    expect(encrypted.success).toBe(true);

    // Try to decrypt as object
    const decrypted = await webKit.tryDecryptObj(encrypted.result as string, key);
    expect(decrypted.success).toBe(false);
    expect(decrypted.error).toBeDefined();
  });

  test("Node: Fail with empty ciphertext", () => {
    const keyResult = nodeKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"node">;

    const decrypted = nodeKit.tryDecryptObj("", key);
    expect(decrypted.success).toBe(false);
    expect(decrypted.error).toBeDefined();
  });

  test("Web: Fail with empty ciphertext", async () => {
    const keyResult = await webKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"web">;

    const decrypted = await webKit.tryDecryptObj("", key);
    expect(decrypted.success).toBe(false);
    expect(decrypted.error).toBeDefined();
  });
});

describe("Object Encryption/Decryption - Error Consistency", () => {
  test("Node and Web return consistent errors for non-object input", async () => {
    const nodeKeyResult = nodeKit.tryCreateSecretKey(secret);
    const webKeyResult = await webKit.tryCreateSecretKey(secret);
    expect(nodeKeyResult.success).toBe(true);
    expect(webKeyResult.success).toBe(true);
    const nodeKey = nodeKeyResult.result as SecretKey<"node">;
    const webKey = webKeyResult.result as SecretKey<"web">;

    // @ts-expect-error Testing invalid input type
    const nodeResult = nodeKit.tryEncryptObj("not an object", nodeKey);
    // @ts-expect-error Testing invalid input type
    const webResult = await webKit.tryEncryptObj("not an object", webKey);

    expect(nodeResult.success).toBe(false);
    expect(webResult.success).toBe(false);
    // Both should fail with similar messages
    expect(nodeResult.error).toBeDefined();
    expect(webResult.error).toBeDefined();
  });
});
