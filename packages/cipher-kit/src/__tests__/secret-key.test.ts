import { describe, expect, test } from "vitest";
import { nodeKit, webKit } from "~/export";

describe("Secret Key Creation - Success Cases", () => {
  const validSecret = "Secret0123456789Secret0123456789";

  test("Node: Create secret key with default options", () => {
    const result = nodeKit.tryCreateSecretKey(validSecret);
    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
    expect(nodeKit.isNodeSecretKey(result.result)).toBe(true);
  });

  test("Web: Create secret key with default options", async () => {
    const result = await webKit.tryCreateSecretKey(validSecret);
    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
    expect(webKit.isWebSecretKey(result.result)).toBe(true);
  });

  test("Node: Create secret key with AES-128-GCM", () => {
    const result = nodeKit.tryCreateSecretKey(validSecret, { algorithm: "aes128gcm" });
    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
  });

  test("Web: Create secret key with AES-128-GCM", async () => {
    const result = await webKit.tryCreateSecretKey(validSecret, { algorithm: "aes128gcm" });
    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
  });

  test("Node: Create secret key with custom salt and info", () => {
    const result = nodeKit.tryCreateSecretKey(validSecret, {
      salt: "customsalt",
      info: "custominfo",
    });
    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
  });

  test("Web: Create secret key with custom salt and info", async () => {
    const result = await webKit.tryCreateSecretKey(validSecret, {
      salt: "customsalt",
      info: "custominfo",
    });
    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
  });
});

describe("Secret Key Creation - Error Cases", () => {
  test("Node: Fail with empty secret", () => {
    const result = nodeKit.tryCreateSecretKey("");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toBeTruthy();
  });

  test("Web: Fail with empty secret", async () => {
    const result = await webKit.tryCreateSecretKey("");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toBeTruthy();
  });

  test("Node: Fail with whitespace-only secret", () => {
    const result = nodeKit.tryCreateSecretKey("   ");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("Web: Fail with whitespace-only secret", async () => {
    const result = await webKit.tryCreateSecretKey("   ");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("Node: Fail with too short salt", () => {
    const result = nodeKit.tryCreateSecretKey("validSecret123", { salt: "short" });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.description.toLowerCase()).toContain("salt");
  });

  test("Web: Fail with too short salt", async () => {
    const result = await webKit.tryCreateSecretKey("validSecret123", { salt: "short" });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.description.toLowerCase()).toContain("salt");
  });

  test("Node: Fail with invalid type (null)", () => {
    // @ts-expect-error Testing invalid input type
    const result = nodeKit.tryCreateSecretKey(null);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("Web: Fail with invalid type (null)", async () => {
    // @ts-expect-error Testing invalid input type
    const result = await webKit.tryCreateSecretKey(null);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("Node: Fail with invalid type (undefined)", () => {
    // @ts-expect-error Testing invalid input type
    const result = nodeKit.tryCreateSecretKey(undefined);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("Web: Fail with invalid type (undefined)", async () => {
    // @ts-expect-error Testing invalid input type
    const result = await webKit.tryCreateSecretKey(undefined);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("Node: Fail with invalid type (number)", () => {
    // @ts-expect-error Testing invalid input type
    const result = nodeKit.tryCreateSecretKey(12345);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("Web: Fail with invalid type (number)", async () => {
    // @ts-expect-error Testing invalid input type
    const result = await webKit.tryCreateSecretKey(12345);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("Secret Key Validation - Error Consistency", () => {
  test("Node and Web return similar errors for empty secret", async () => {
    const nodeResult = nodeKit.tryCreateSecretKey("");
    const webResult = await webKit.tryCreateSecretKey("");

    expect(nodeResult.success).toBe(false);
    expect(webResult.success).toBe(false);
    // Both should have "Empty Secret" in the message
    expect(nodeResult.error?.message).toContain("Empty Secret");
    expect(webResult.error?.message).toContain("Empty Secret");
  });

  test("Node and Web return similar errors for short salt", async () => {
    const nodeResult = nodeKit.tryCreateSecretKey("validSecret123", { salt: "short" });
    const webResult = await webKit.tryCreateSecretKey("validSecret123", { salt: "short" });

    expect(nodeResult.success).toBe(false);
    expect(webResult.success).toBe(false);
    // Both should have "Weak salt" in the message
    expect(nodeResult.error?.message).toContain("Weak salt");
    expect(webResult.error?.message).toContain("Weak salt");
  });
});
