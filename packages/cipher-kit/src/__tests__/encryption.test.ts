import { describe, expect, test } from "vitest";
import { matchPattern, nodeKit, type SecretKey, webKit } from "~/export";

const secret = "Secret0123456789Secret0123456789";
const data = "🦊 secret stuff ~ !@#$%^&*()_+";

describe("Encryption/Decryption - Success Cases", () => {
  test("Node: Encrypt and decrypt with default options", () => {
    const keyResult = nodeKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"node">;

    const encrypted = nodeKit.tryEncrypt(data, key);
    expect(encrypted.success).toBe(true);
    expect(encrypted.result).toBeDefined();
    expect(matchPattern(encrypted.result as string, "node")).toBe(true);

    const decrypted = nodeKit.tryDecrypt(encrypted.result as string, key);
    expect(decrypted.success).toBe(true);
    expect(decrypted.result).toBe(data);
  });

  test("Web: Encrypt and decrypt with default options", async () => {
    const keyResult = await webKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"web">;

    const encrypted = await webKit.tryEncrypt(data, key);
    expect(encrypted.success).toBe(true);
    expect(encrypted.result).toBeDefined();
    expect(matchPattern(encrypted.result as string, "web")).toBe(true);

    const decrypted = await webKit.tryDecrypt(encrypted.result as string, key);
    expect(decrypted.success).toBe(true);
    expect(decrypted.result).toBe(data);
  });

  test("Node: Encrypt with hex encoding", () => {
    const keyResult = nodeKit.tryCreateSecretKey(secret, { algorithm: "aes128gcm" });
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"node">;

    const encrypted = nodeKit.tryEncrypt(data, key, { encoding: "hex" });
    expect(encrypted.success).toBe(true);
    expect(encrypted.result).toBeDefined();

    const decrypted = nodeKit.tryDecrypt(encrypted.result as string, key, { encoding: "hex" });
    expect(decrypted.success).toBe(true);
    expect(decrypted.result).toBe(data);
  });

  test("Web: Encrypt with hex encoding", async () => {
    const keyResult = await webKit.tryCreateSecretKey(secret, { algorithm: "aes128gcm" });
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"web">;

    const encrypted = await webKit.tryEncrypt(data, key, { encoding: "hex" });
    expect(encrypted.success).toBe(true);
    expect(encrypted.result).toBeDefined();

    const decrypted = await webKit.tryDecrypt(encrypted.result as string, key, { encoding: "hex" });
    expect(decrypted.success).toBe(true);
    expect(decrypted.result).toBe(data);
  });

  test("Node: Encrypt with base64 encoding", () => {
    const keyResult = nodeKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"node">;

    const encrypted = nodeKit.tryEncrypt(data, key, { encoding: "base64" });
    expect(encrypted.success).toBe(true);

    const decrypted = nodeKit.tryDecrypt(encrypted.result as string, key, { encoding: "base64" });
    expect(decrypted.success).toBe(true);
    expect(decrypted.result).toBe(data);
  });

  test("Web: Encrypt with base64 encoding", async () => {
    const keyResult = await webKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"web">;

    const encrypted = await webKit.tryEncrypt(data, key, { encoding: "base64" });
    expect(encrypted.success).toBe(true);

    const decrypted = await webKit.tryDecrypt(encrypted.result as string, key, { encoding: "base64" });
    expect(decrypted.success).toBe(true);
    expect(decrypted.result).toBe(data);
  });

  test("Node: Each encryption produces unique ciphertext", () => {
    const keyResult = nodeKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"node">;

    const encrypted1 = nodeKit.tryEncrypt(data, key);
    const encrypted2 = nodeKit.tryEncrypt(data, key);

    expect(encrypted1.success).toBe(true);
    expect(encrypted2.success).toBe(true);
    expect(encrypted1.result).not.toBe(encrypted2.result);
  });

  test("Web: Each encryption produces unique ciphertext", async () => {
    const keyResult = await webKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"web">;

    const encrypted1 = await webKit.tryEncrypt(data, key);
    const encrypted2 = await webKit.tryEncrypt(data, key);

    expect(encrypted1.success).toBe(true);
    expect(encrypted2.success).toBe(true);
    expect(encrypted1.result).not.toBe(encrypted2.result);
  });
});

describe("Encryption - Error Cases", () => {
  test("Node: Fail with empty data", () => {
    const keyResult = nodeKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"node">;

    const encrypted = nodeKit.tryEncrypt("", key);
    expect(encrypted.success).toBe(false);
    expect(encrypted.error).toBeDefined();
  });

  test("Web: Fail with empty data", async () => {
    const keyResult = await webKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"web">;

    const encrypted = await webKit.tryEncrypt("", key);
    expect(encrypted.success).toBe(false);
    expect(encrypted.error).toBeDefined();
  });

  test("Node: Fail with invalid key type", () => {
    // @ts-expect-error Testing invalid key type
    const encrypted = nodeKit.tryEncrypt(data, null);
    expect(encrypted.success).toBe(false);
    expect(encrypted.error).toBeDefined();
  });

  test("Web: Fail with invalid key type", async () => {
    // @ts-expect-error Testing invalid key type
    const encrypted = await webKit.tryEncrypt(data, null);
    expect(encrypted.success).toBe(false);
    expect(encrypted.error).toBeDefined();
  });

  test("Node: Fail with invalid key object", () => {
    // @ts-expect-error Testing invalid key object
    const encrypted = nodeKit.tryEncrypt(data, { platform: "node" });
    expect(encrypted.success).toBe(false);
    expect(encrypted.error).toBeDefined();
  });

  test("Web: Fail with invalid key object", async () => {
    // @ts-expect-error Testing invalid key object
    const encrypted = await webKit.tryEncrypt(data, { platform: "web" });
    expect(encrypted.success).toBe(false);
    expect(encrypted.error).toBeDefined();
  });

  test("Node: Fail with wrong platform key", async () => {
    const webKeyResult = await webKit.tryCreateSecretKey(secret);
    expect(webKeyResult.success).toBe(true);
    const webKey = webKeyResult.result as SecretKey<"web">;

    // @ts-expect-error Testing wrong platform key
    const encrypted = nodeKit.tryEncrypt(data, webKey);
    expect(encrypted.success).toBe(false);
    expect(encrypted.error).toBeDefined();
  });

  test("Web: Fail with wrong platform key", async () => {
    const nodeKeyResult = nodeKit.tryCreateSecretKey(secret);
    expect(nodeKeyResult.success).toBe(true);
    const nodeKey = nodeKeyResult.result as SecretKey<"node">;

    // @ts-expect-error Testing wrong platform key
    const encrypted = await webKit.tryEncrypt(data, nodeKey);
    expect(encrypted.success).toBe(false);
    expect(encrypted.error).toBeDefined();
  });
});

describe("Decryption - Error Cases", () => {
  test("Node: Fail with corrupted ciphertext", () => {
    const keyResult = nodeKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"node">;

    const encrypted = nodeKit.tryEncrypt(data, key);
    expect(encrypted.success).toBe(true);

    // Corrupt the ciphertext by modifying a character
    const corrupted = (encrypted.result as string).replace(/[a-z]/, "x");

    const decrypted = nodeKit.tryDecrypt(corrupted, key);
    expect(decrypted.success).toBe(false);
    expect(decrypted.error).toBeDefined();
  });

  test("Web: Fail with corrupted ciphertext", async () => {
    const keyResult = await webKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"web">;

    const encrypted = await webKit.tryEncrypt(data, key);
    expect(encrypted.success).toBe(true);

    // Corrupt the ciphertext by modifying a character
    const corrupted = (encrypted.result as string).replace(/[a-z]/, "x");

    const decrypted = await webKit.tryDecrypt(corrupted, key);
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

    const encrypted = nodeKit.tryEncrypt(data, key1);
    expect(encrypted.success).toBe(true);

    const decrypted = nodeKit.tryDecrypt(encrypted.result as string, key2);
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

    const encrypted = await webKit.tryEncrypt(data, key1);
    expect(encrypted.success).toBe(true);

    const decrypted = await webKit.tryDecrypt(encrypted.result as string, key2);
    expect(decrypted.success).toBe(false);
    expect(decrypted.error).toBeDefined();
  });

  test("Node: Fail with invalid ciphertext format", () => {
    const keyResult = nodeKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"node">;

    const decrypted = nodeKit.tryDecrypt("invalid_format", key);
    expect(decrypted.success).toBe(false);
    expect(decrypted.error).toBeDefined();
  });

  test("Web: Fail with invalid ciphertext format", async () => {
    const keyResult = await webKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"web">;

    const decrypted = await webKit.tryDecrypt("invalid_format", key);
    expect(decrypted.success).toBe(false);
    expect(decrypted.error).toBeDefined();
  });

  test("Node: Fail with empty ciphertext", () => {
    const keyResult = nodeKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"node">;

    const decrypted = nodeKit.tryDecrypt("", key);
    expect(decrypted.success).toBe(false);
    expect(decrypted.error).toBeDefined();
  });

  test("Web: Fail with empty ciphertext", async () => {
    const keyResult = await webKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"web">;

    const decrypted = await webKit.tryDecrypt("", key);
    expect(decrypted.success).toBe(false);
    expect(decrypted.error).toBeDefined();
  });

  test("Node: Fail with wrong encoding", () => {
    const keyResult = nodeKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"node">;

    const encrypted = nodeKit.tryEncrypt(data, key, { encoding: "hex" });
    expect(encrypted.success).toBe(true);

    // Try to decrypt with wrong encoding
    const decrypted = nodeKit.tryDecrypt(encrypted.result as string, key, { encoding: "base64" });
    expect(decrypted.success).toBe(false);
    expect(decrypted.error).toBeDefined();
  });

  test("Web: Fail with wrong encoding", async () => {
    const keyResult = await webKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"web">;

    const encrypted = await webKit.tryEncrypt(data, key, { encoding: "hex" });
    expect(encrypted.success).toBe(true);

    // Try to decrypt with wrong encoding
    const decrypted = await webKit.tryDecrypt(encrypted.result as string, key, { encoding: "base64" });
    expect(decrypted.success).toBe(false);
    expect(decrypted.error).toBeDefined();
  });

  test("Node: Fail with tampered authentication tag", () => {
    const keyResult = nodeKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"node">;

    const encrypted = nodeKit.tryEncrypt(data, key);
    expect(encrypted.success).toBe(true);

    // Tamper with the tag part (last segment before final dot)
    const parts = (encrypted.result as string).split(".");
    if (parts[2]) parts[2] = parts[2].slice(0, -2) + "XX";
    const tampered = parts.join(".");

    const decrypted = nodeKit.tryDecrypt(tampered, key);
    expect(decrypted.success).toBe(false);
    expect(decrypted.error).toBeDefined();
  });

  test("Web: Fail with tampered authentication tag", async () => {
    const keyResult = await webKit.tryCreateSecretKey(secret);
    expect(keyResult.success).toBe(true);
    const key = keyResult.result as SecretKey<"web">;

    const encrypted = await webKit.tryEncrypt(data, key);
    expect(encrypted.success).toBe(true);

    // Tamper with the combined cipher+tag part
    const parts = (encrypted.result as string).split(".");
    if (parts[1]) parts[1] = parts[1].slice(0, -2) + "XX";
    const tampered = parts.join(".");

    const decrypted = await webKit.tryDecrypt(tampered, key);
    expect(decrypted.success).toBe(false);
    expect(decrypted.error).toBeDefined();
  });
});

describe("Encryption/Decryption - Error Consistency", () => {
  test("Node and Web return similar errors for empty data", async () => {
    const nodeKeyResult = nodeKit.tryCreateSecretKey(secret);
    const webKeyResult = await webKit.tryCreateSecretKey(secret);
    expect(nodeKeyResult.success).toBe(true);
    expect(webKeyResult.success).toBe(true);
    const nodeKey = nodeKeyResult.result as SecretKey<"node">;
    const webKey = webKeyResult.result as SecretKey<"web">;

    const nodeResult = nodeKit.tryEncrypt("", nodeKey);
    const webResult = await webKit.tryEncrypt("", webKey);

    expect(nodeResult.success).toBe(false);
    expect(webResult.success).toBe(false);
    // Both should contain "Empty data" in the message
    expect(nodeResult.error?.message).toContain("Empty data");
    expect(webResult.error?.message).toContain("Empty data");
  });

  test("Node and Web return similar errors for invalid ciphertext", async () => {
    const nodeKeyResult = nodeKit.tryCreateSecretKey(secret);
    const webKeyResult = await webKit.tryCreateSecretKey(secret);
    expect(nodeKeyResult.success).toBe(true);
    expect(webKeyResult.success).toBe(true);
    const nodeKey = nodeKeyResult.result as SecretKey<"node">;
    const webKey = webKeyResult.result as SecretKey<"web">;

    const nodeResult = nodeKit.tryDecrypt("invalid", nodeKey);
    const webResult = await webKit.tryDecrypt("invalid", webKey);

    expect(nodeResult.success).toBe(false);
    expect(webResult.success).toBe(false);
    // Both should contain "Invalid" in the message
    expect(nodeResult.error?.message).toContain("Invalid");
    expect(webResult.error?.message).toContain("Invalid");
  });
});
