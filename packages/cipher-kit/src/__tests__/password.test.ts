import { describe, expect, test } from "vitest";
import { nodeKit, webKit } from "~/export";

const validPassword = "SuperSecretPassword!123";

describe("Password Hashing - Success Cases", () => {
  test("Node: Hash password successfully", () => {
    const result = nodeKit.tryHashPassword(validPassword);
    expect(result.success).toBe(true);
    expect(result.hash).toBeDefined();
    expect(result.salt).toBeDefined();
    expect(typeof result.hash).toBe("string");
    expect(typeof result.salt).toBe("string");
  });

  test("Web: Hash password successfully", async () => {
    const result = await webKit.tryHashPassword(validPassword);
    expect(result.success).toBe(true);
    expect(result.hash).toBeDefined();
    expect(result.salt).toBeDefined();
    expect(typeof result.hash).toBe("string");
    expect(typeof result.salt).toBe("string");
  });

  test("Node: Different salts produce different hashes", () => {
    const result1 = nodeKit.tryHashPassword(validPassword);
    const result2 = nodeKit.tryHashPassword(validPassword);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.salt).not.toBe(result2.salt);
    expect(result1.hash).not.toBe(result2.hash);
  });

  test("Web: Different salts produce different hashes", async () => {
    const result1 = await webKit.tryHashPassword(validPassword);
    const result2 = await webKit.tryHashPassword(validPassword);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.salt).not.toBe(result2.salt);
    expect(result1.hash).not.toBe(result2.hash);
  });

  test("Node: Hash password with custom iterations", () => {
    const result = nodeKit.tryHashPassword(validPassword, { iterations: 100000 });
    expect(result.success).toBe(true);
    expect(result.hash).toBeDefined();
    expect(result.salt).toBeDefined();
  });

  test("Web: Hash password with custom iterations", async () => {
    const result = await webKit.tryHashPassword(validPassword, { iterations: 100000 });
    expect(result.success).toBe(true);
    expect(result.hash).toBeDefined();
    expect(result.salt).toBeDefined();
  });

  test("Node: Hash password with custom digest", () => {
    const result = nodeKit.tryHashPassword(validPassword, { digest: "sha512" });
    expect(result.success).toBe(true);
    expect(result.hash).toBeDefined();
    expect(result.salt).toBeDefined();
  });

  test("Web: Hash password with custom digest", async () => {
    const result = await webKit.tryHashPassword(validPassword, { digest: "sha512" });
    expect(result.success).toBe(true);
    expect(result.hash).toBeDefined();
    expect(result.salt).toBeDefined();
  });

  test("Node: Hash password with custom encoding", () => {
    const result = nodeKit.tryHashPassword(validPassword, { encoding: "hex" });
    expect(result.success).toBe(true);
    expect(result.hash).toBeDefined();
    expect(result.salt).toBeDefined();
  });

  test("Web: Hash password with custom encoding", async () => {
    const result = await webKit.tryHashPassword(validPassword, { encoding: "hex" });
    expect(result.success).toBe(true);
    expect(result.hash).toBeDefined();
    expect(result.salt).toBeDefined();
  });
});

describe("Password Verification - Success Cases", () => {
  test("Node: Verify correct password", () => {
    const hashResult = nodeKit.tryHashPassword(validPassword);
    expect(hashResult.success).toBe(true);

    const verified = nodeKit.verifyPassword(validPassword, hashResult.hash as string, hashResult.salt as string);
    expect(verified).toBe(true);
  });

  test("Web: Verify correct password", async () => {
    const hashResult = await webKit.tryHashPassword(validPassword);
    expect(hashResult.success).toBe(true);

    const verified = await webKit.verifyPassword(validPassword, hashResult.hash as string, hashResult.salt as string);
    expect(verified).toBe(true);
  });

  test("Node: Reject incorrect password", () => {
    const hashResult = nodeKit.tryHashPassword(validPassword);
    expect(hashResult.success).toBe(true);

    const verified = nodeKit.verifyPassword("WrongPassword123!", hashResult.hash as string, hashResult.salt as string);
    expect(verified).toBe(false);
  });

  test("Web: Reject incorrect password", async () => {
    const hashResult = await webKit.tryHashPassword(validPassword);
    expect(hashResult.success).toBe(true);

    const verified = await webKit.verifyPassword(
      "WrongPassword123!",
      hashResult.hash as string,
      hashResult.salt as string,
    );
    expect(verified).toBe(false);
  });

  test("Node: Verify with custom iterations", () => {
    const hashResult = nodeKit.tryHashPassword(validPassword, { iterations: 50000 });
    expect(hashResult.success).toBe(true);

    const verified = nodeKit.verifyPassword(validPassword, hashResult.hash as string, hashResult.salt as string, {
      iterations: 50000,
    });
    expect(verified).toBe(true);
  });

  test("Web: Verify with custom iterations", async () => {
    const hashResult = await webKit.tryHashPassword(validPassword, { iterations: 50000 });
    expect(hashResult.success).toBe(true);

    const verified = await webKit.verifyPassword(validPassword, hashResult.hash as string, hashResult.salt as string, {
      iterations: 50000,
    });
    expect(verified).toBe(true);
  });

  test("Node: Verify with custom digest", () => {
    const hashResult = nodeKit.tryHashPassword(validPassword, { digest: "sha384" });
    expect(hashResult.success).toBe(true);

    const verified = nodeKit.verifyPassword(validPassword, hashResult.hash as string, hashResult.salt as string, {
      digest: "sha384",
    });
    expect(verified).toBe(true);
  });

  test("Web: Verify with custom digest", async () => {
    const hashResult = await webKit.tryHashPassword(validPassword, { digest: "sha384" });
    expect(hashResult.success).toBe(true);

    const verified = await webKit.verifyPassword(validPassword, hashResult.hash as string, hashResult.salt as string, {
      digest: "sha384",
    });
    expect(verified).toBe(true);
  });
});

describe("Password Hashing - Error Cases", () => {
  test("Node: Fail with empty password", () => {
    const result = nodeKit.tryHashPassword("");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("Web: Fail with empty password", async () => {
    const result = await webKit.tryHashPassword("");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("Node: Fail with whitespace-only password", () => {
    const result = nodeKit.tryHashPassword("   ");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("Web: Fail with whitespace-only password", async () => {
    const result = await webKit.tryHashPassword("   ");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("Node: Fail with invalid type (null)", () => {
    // @ts-expect-error Testing invalid input type
    const result = nodeKit.tryHashPassword(null);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("Web: Fail with invalid type (null)", async () => {
    // @ts-expect-error Testing invalid input type
    const result = await webKit.tryHashPassword(null);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("Node: Fail with invalid type (undefined)", () => {
    // @ts-expect-error Testing invalid input type
    const result = nodeKit.tryHashPassword(undefined);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("Web: Fail with invalid type (undefined)", async () => {
    // @ts-expect-error Testing invalid input type
    const result = await webKit.tryHashPassword(undefined);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("Node: Fail with invalid type (number)", () => {
    // @ts-expect-error Testing invalid input type
    const result = nodeKit.tryHashPassword(12345);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("Web: Fail with invalid type (number)", async () => {
    // @ts-expect-error Testing invalid input type
    const result = await webKit.tryHashPassword(12345);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("Node: Fail with too few iterations", () => {
    const result = nodeKit.tryHashPassword(validPassword, { iterations: 100 });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.description.toLowerCase()).toContain("iteration");
  });

  test("Web: Fail with too few iterations", async () => {
    const result = await webKit.tryHashPassword(validPassword, { iterations: 100 });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.description.toLowerCase()).toContain("iteration");
  });
});

describe("Password Verification - Error Cases", () => {
  test("Node: Return false with empty password", () => {
    const hashResult = nodeKit.tryHashPassword(validPassword);
    expect(hashResult.success).toBe(true);

    const verified = nodeKit.verifyPassword("", hashResult.hash as string, hashResult.salt as string);
    expect(verified).toBe(false);
  });

  test("Web: Return false with empty password", async () => {
    const hashResult = await webKit.tryHashPassword(validPassword);
    expect(hashResult.success).toBe(true);

    const verified = await webKit.verifyPassword("", hashResult.hash as string, hashResult.salt as string);
    expect(verified).toBe(false);
  });

  test("Node: Return false with empty hash", () => {
    const hashResult = nodeKit.tryHashPassword(validPassword);
    expect(hashResult.success).toBe(true);

    const verified = nodeKit.verifyPassword(validPassword, "", hashResult.salt as string);
    expect(verified).toBe(false);
  });

  test("Web: Return false with empty hash", async () => {
    const hashResult = await webKit.tryHashPassword(validPassword);
    expect(hashResult.success).toBe(true);

    const verified = await webKit.verifyPassword(validPassword, "", hashResult.salt as string);
    expect(verified).toBe(false);
  });

  test("Node: Return false with empty salt", () => {
    const hashResult = nodeKit.tryHashPassword(validPassword);
    expect(hashResult.success).toBe(true);

    const verified = nodeKit.verifyPassword(validPassword, hashResult.hash as string, "");
    expect(verified).toBe(false);
  });

  test("Web: Return false with empty salt", async () => {
    const hashResult = await webKit.tryHashPassword(validPassword);
    expect(hashResult.success).toBe(true);

    const verified = await webKit.verifyPassword(validPassword, hashResult.hash as string, "");
    expect(verified).toBe(false);
  });

  test("Node: Return false with corrupted hash", () => {
    const hashResult = nodeKit.tryHashPassword(validPassword);
    expect(hashResult.success).toBe(true);

    const corruptedHash = (hashResult.hash as string).slice(0, -5) + "XXXXX";
    const verified = nodeKit.verifyPassword(validPassword, corruptedHash, hashResult.salt as string);
    expect(verified).toBe(false);
  });

  test("Web: Return false with corrupted hash", async () => {
    const hashResult = await webKit.tryHashPassword(validPassword);
    expect(hashResult.success).toBe(true);

    const corruptedHash = (hashResult.hash as string).slice(0, -5) + "XXXXX";
    const verified = await webKit.verifyPassword(validPassword, corruptedHash, hashResult.salt as string);
    expect(verified).toBe(false);
  });

  test("Node: Return false with corrupted salt", () => {
    const hashResult = nodeKit.tryHashPassword(validPassword);
    expect(hashResult.success).toBe(true);

    const corruptedSalt = (hashResult.salt as string).slice(0, -5) + "XXXXX";
    const verified = nodeKit.verifyPassword(validPassword, hashResult.hash as string, corruptedSalt);
    expect(verified).toBe(false);
  });

  test("Web: Return false with corrupted salt", async () => {
    const hashResult = await webKit.tryHashPassword(validPassword);
    expect(hashResult.success).toBe(true);

    const corruptedSalt = (hashResult.salt as string).slice(0, -5) + "XXXXX";
    const verified = await webKit.verifyPassword(validPassword, hashResult.hash as string, corruptedSalt);
    expect(verified).toBe(false);
  });

  test("Node: Return false with mismatched iterations", () => {
    const hashResult = nodeKit.tryHashPassword(validPassword, { iterations: 50000 });
    expect(hashResult.success).toBe(true);

    // Verify with different iterations
    const verified = nodeKit.verifyPassword(validPassword, hashResult.hash as string, hashResult.salt as string, {
      iterations: 100000,
    });
    expect(verified).toBe(false);
  });

  test("Web: Return false with mismatched iterations", async () => {
    const hashResult = await webKit.tryHashPassword(validPassword, { iterations: 50000 });
    expect(hashResult.success).toBe(true);

    // Verify with different iterations
    const verified = await webKit.verifyPassword(validPassword, hashResult.hash as string, hashResult.salt as string, {
      iterations: 100000,
    });
    expect(verified).toBe(false);
  });

  test("Node: Return false with mismatched digest", () => {
    const hashResult = nodeKit.tryHashPassword(validPassword, { digest: "sha256" });
    expect(hashResult.success).toBe(true);

    // Verify with different digest
    const verified = nodeKit.verifyPassword(validPassword, hashResult.hash as string, hashResult.salt as string, {
      digest: "sha512",
    });
    expect(verified).toBe(false);
  });

  test("Web: Return false with mismatched digest", async () => {
    const hashResult = await webKit.tryHashPassword(validPassword, { digest: "sha256" });
    expect(hashResult.success).toBe(true);

    // Verify with different digest
    const verified = await webKit.verifyPassword(validPassword, hashResult.hash as string, hashResult.salt as string, {
      digest: "sha512",
    });
    expect(verified).toBe(false);
  });
});

describe("Password Hashing - Error Consistency", () => {
  test("Node and Web return similar errors for empty password", async () => {
    const nodeResult = nodeKit.tryHashPassword("");
    const webResult = await webKit.tryHashPassword("");

    expect(nodeResult.success).toBe(false);
    expect(webResult.success).toBe(false);
    // Both should contain "Empty" or "password" in the message
    expect(nodeResult.error?.message).toContain("Empty");
    expect(webResult.error?.message).toContain("Empty");
  });

  test("Node and Web return similar errors for low iterations", async () => {
    const nodeResult = nodeKit.tryHashPassword(validPassword, { iterations: 100 });
    const webResult = await webKit.tryHashPassword(validPassword, { iterations: 100 });

    expect(nodeResult.success).toBe(false);
    expect(webResult.success).toBe(false);
    // Both should contain "iteration" in the message
    expect(nodeResult.error?.message.toLowerCase()).toContain("iteration");
    expect(webResult.error?.message.toLowerCase()).toContain("iteration");
  });

  test("Node and Web both reject wrong passwords", async () => {
    const nodeHashResult = nodeKit.tryHashPassword(validPassword);
    const webHashResult = await webKit.tryHashPassword(validPassword);
    expect(nodeHashResult.success).toBe(true);
    expect(webHashResult.success).toBe(true);

    const nodeVerified = nodeKit.verifyPassword(
      "WrongPassword",
      nodeHashResult.hash as string,
      nodeHashResult.salt as string,
    );
    const webVerified = await webKit.verifyPassword(
      "WrongPassword",
      webHashResult.hash as string,
      webHashResult.salt as string,
    );

    expect(nodeVerified).toBe(false);
    expect(webVerified).toBe(false);
  });
});
