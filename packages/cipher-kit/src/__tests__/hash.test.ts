import { describe, expect, test } from "vitest";
import { nodeKit, webKit } from "~/export.js";
import { data, repeated } from "./__helpers__.js";

describe("Hashing", () => {
  test("Hash Test", async () => {
    expect(nodeKit.hash(data, { digest: "sha256" })).toBe(await webKit.hash(data, { digest: "sha256" }));
    expect(nodeKit.hash(data, { digest: "sha384" })).toBe(await webKit.hash(data, { digest: "sha384" }));
    expect(nodeKit.hash(data, { digest: "sha512" })).toBe(await webKit.hash(data, { digest: "sha512" }));

    expect(nodeKit.hash(repeated, { digest: "sha256" })).toBe(await webKit.hash(repeated, { digest: "sha256" }));
    expect(nodeKit.hash(repeated, { digest: "sha384" })).toBe(await webKit.hash(repeated, { digest: "sha384" }));
    expect(nodeKit.hash(repeated, { digest: "sha512" })).toBe(await webKit.hash(repeated, { digest: "sha512" }));
  });

  test("Password Hash Test", async () => {
    const password = "SuperSecretPassword!";

    const nodeHash = nodeKit.tryHashPassword(password);
    expect(nodeHash.success).toBe(true);
    expect(nodeHash.result).toBeDefined();
    expect(nodeHash.salt).toBeDefined();

    const webHash = await webKit.tryHashPassword(password);
    expect(webHash.success).toBe(true);
    expect(webHash.result).toBeDefined();
    expect(webHash.salt).toBeDefined();

    expect(nodeHash.result).not.toBe(webHash.result);
    expect(nodeHash.salt).not.toBe(webHash.salt);

    const nodeVerify = nodeKit.verifyPassword(password, nodeHash.result as string, nodeHash.salt as string);
    expect(nodeVerify).toBe(true);

    const webVerify = await webKit.verifyPassword(password, webHash.result as string, webHash.salt as string);
    expect(webVerify).toBe(true);

    const nodeVerifyWrong = nodeKit.verifyPassword(
      "SuperSecredPassword",
      nodeHash.result as string,
      nodeHash.salt as string,
    );
    expect(nodeVerifyWrong).toBe(false);

    const webVerifyWrong = await webKit.verifyPassword(
      "SuperSecredPassword",
      webHash.result as string,
      webHash.salt as string,
    );
    expect(webVerifyWrong).toBe(false);
  });

  test("Node: verifyPassword rejects weak iterations", () => {
    const password = "SuperSecretPassword!";
    const nodeHash = nodeKit.tryHashPassword(password);
    expect(nodeHash.success).toBe(true);

    expect(() =>
      nodeKit.verifyPassword(password, nodeHash.result as string, nodeHash.salt as string, {
        iterations: 50_000,
      }),
    ).toThrow("Iterations must be at least 100,000");
  });

  test("Web: verifyPassword rejects weak iterations", async () => {
    const password = "SuperSecretPassword!";
    const webHash = await webKit.tryHashPassword(password);
    expect(webHash.success).toBe(true);

    await expect(
      webKit.verifyPassword(password, webHash.result as string, webHash.salt as string, {
        iterations: 50_000,
      }),
    ).rejects.toThrow("Iterations must be at least 100,000");
  });

  test("Node: hashPassword rejects extreme cost parameters", () => {
    const result = nodeKit.tryHashPassword("pw", {
      saltLength: 10_000,
      iterations: 20_000_000,
      keyLength: 2_048,
    });
    expect(result.success).toBe(false);
  });

  test("Web: hashPassword rejects extreme cost parameters", async () => {
    const result = await webKit.tryHashPassword("pw", {
      saltLength: 10_000,
      iterations: 20_000_000,
      keyLength: 2_048,
    });
    expect(result.success).toBe(false);
  });

  test("Cross-platform: Node hashPassword → Web verifyPassword", async () => {
    const password = "CrossPlatformPassword!";
    const nodeHash = nodeKit.tryHashPassword(password);
    expect(nodeHash.success).toBe(true);

    const webVerify = await webKit.verifyPassword(password, nodeHash.result as string, nodeHash.salt as string);
    expect(webVerify).toBe(true);

    const webVerifyWrong = await webKit.verifyPassword(
      "WrongPassword",
      nodeHash.result as string,
      nodeHash.salt as string,
    );
    expect(webVerifyWrong).toBe(false);
  });

  test("Cross-platform: Web hashPassword → Node verifyPassword", async () => {
    const password = "CrossPlatformPassword!";
    const webHash = await webKit.tryHashPassword(password);
    expect(webHash.success).toBe(true);

    const nodeVerify = nodeKit.verifyPassword(password, webHash.result as string, webHash.salt as string);
    expect(nodeVerify).toBe(true);

    const nodeVerifyWrong = nodeKit.verifyPassword("WrongPassword", webHash.result as string, webHash.salt as string);
    expect(nodeVerifyWrong).toBe(false);
  });

  test("Node: verifyPassword rejects oversized hashedPassword before allocation", () => {
    const password = "SuperSecretPassword!";
    const nodeHash = nodeKit.tryHashPassword(password);
    expect(nodeHash.success).toBe(true);

    const oversizedHash = "A".repeat(100_000);
    const result = nodeKit.tryVerifyPassword(password, oversizedHash, nodeHash.salt as string);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("exceeds maximum");
  });

  test("Web: verifyPassword rejects oversized hashedPassword before allocation", async () => {
    const password = "SuperSecretPassword!";
    const webHash = await webKit.tryHashPassword(password);
    expect(webHash.success).toBe(true);

    const oversizedHash = "A".repeat(100_000);
    const result = await webKit.tryVerifyPassword(password, oversizedHash, webHash.salt as string);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("exceeds maximum");
  });

  test("Node: verifyPassword rejects oversized salt before allocation", () => {
    const password = "SuperSecretPassword!";
    const nodeHash = nodeKit.tryHashPassword(password);
    expect(nodeHash.success).toBe(true);

    const oversizedSalt = "A".repeat(100_000);
    const result = nodeKit.tryVerifyPassword(password, nodeHash.result as string, oversizedSalt);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("exceeds maximum");
  });

  test("Web: verifyPassword rejects oversized salt before allocation", async () => {
    const password = "SuperSecretPassword!";
    const webHash = await webKit.tryHashPassword(password);
    expect(webHash.success).toBe(true);

    const oversizedSalt = "A".repeat(100_000);
    const result = await webKit.tryVerifyPassword(password, webHash.result as string, oversizedSalt);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("exceeds maximum");
  });

  test("Node: verifyPassword returns false for hash with wrong decoded length", () => {
    const password = "SuperSecretPassword!";
    const nodeHash = nodeKit.tryHashPassword(password);
    expect(nodeHash.success).toBe(true);

    // Create a hash that decodes to wrong byte length (short hash)
    const shortHash = Buffer.from("short").toString("base64url");
    const result = nodeKit.tryVerifyPassword(password, shortHash, nodeHash.salt as string);
    expect(result.success).toBe(true);
    expect(result.result).toBe(false);
  });

  test("Web: verifyPassword returns false for hash with wrong decoded length", async () => {
    const password = "SuperSecretPassword!";
    const webHash = await webKit.tryHashPassword(password);
    expect(webHash.success).toBe(true);

    const shortHash = Buffer.from("short").toString("base64url");
    const result = await webKit.tryVerifyPassword(password, shortHash, webHash.salt as string);
    expect(result.success).toBe(true);
    expect(result.result).toBe(false);
  });

  test("Cross-platform: password hash/verify with non-default options", async () => {
    const password = "CrossPlatformPassword!";
    const opts = { digest: "sha384", outputEncoding: "hex" } as const;
    const verifyOpts = { digest: "sha384", inputEncoding: "hex" } as const;

    const nodeHash = nodeKit.tryHashPassword(password, opts);
    expect(nodeHash.success).toBe(true);
    const webVerify = await webKit.verifyPassword(
      password,
      nodeHash.result as string,
      nodeHash.salt as string,
      verifyOpts,
    );
    expect(webVerify).toBe(true);

    const webHash = await webKit.tryHashPassword(password, opts);
    expect(webHash.success).toBe(true);
    const nodeVerify = nodeKit.verifyPassword(password, webHash.result as string, webHash.salt as string, verifyOpts);
    expect(nodeVerify).toBe(true);
  });
});
