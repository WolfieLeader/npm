import { describe, expect, test } from "vitest";
import { nodeKit, webKit } from "~/export";

const data = "🦊 secret stuff ~ !@#$%^&*()_+";

describe("Hashing - Success Cases", () => {
  test("Node: Hash with SHA-256 (default)", () => {
    const hash = nodeKit.hash(data);
    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
    expect(hash.length).toBeGreaterThan(0);
  });

  test("Web: Hash with SHA-256 (default)", async () => {
    const hash = await webKit.hash(data);
    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
    expect(hash.length).toBeGreaterThan(0);
  });

  test("Node: Hash with SHA-384", () => {
    const hash = nodeKit.hash(data, { digest: "sha384" });
    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
  });

  test("Web: Hash with SHA-384", async () => {
    const hash = await webKit.hash(data, { digest: "sha384" });
    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
  });

  test("Node: Hash with SHA-512", () => {
    const hash = nodeKit.hash(data, { digest: "sha512" });
    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
  });

  test("Web: Hash with SHA-512", async () => {
    const hash = await webKit.hash(data, { digest: "sha512" });
    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
  });

  test("Node: Hash with hex encoding", () => {
    const hash = nodeKit.hash(data, { encoding: "hex" });
    expect(hash).toBeDefined();
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });

  test("Web: Hash with hex encoding", async () => {
    const hash = await webKit.hash(data, { encoding: "hex" });
    expect(hash).toBeDefined();
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });

  test("Node: Hash with base64 encoding", () => {
    const hash = nodeKit.hash(data, { encoding: "base64" });
    expect(hash).toBeDefined();
    expect(/^[A-Za-z0-9+/]+=*$/.test(hash)).toBe(true);
  });

  test("Web: Hash with base64 encoding", async () => {
    const hash = await webKit.hash(data, { encoding: "base64" });
    expect(hash).toBeDefined();
    expect(/^[A-Za-z0-9+/]+=*$/.test(hash)).toBe(true);
  });

  test("Node: Hash with base64url encoding", () => {
    const hash = nodeKit.hash(data, { encoding: "base64url" });
    expect(hash).toBeDefined();
    expect(/^[A-Za-z0-9_-]+$/.test(hash)).toBe(true);
  });

  test("Web: Hash with base64url encoding", async () => {
    const hash = await webKit.hash(data, { encoding: "base64url" });
    expect(hash).toBeDefined();
    expect(/^[A-Za-z0-9_-]+$/.test(hash)).toBe(true);
  });

  test("Node: Same input produces same hash", () => {
    const hash1 = nodeKit.hash(data);
    const hash2 = nodeKit.hash(data);
    expect(hash1).toBe(hash2);
  });

  test("Web: Same input produces same hash", async () => {
    const hash1 = await webKit.hash(data);
    const hash2 = await webKit.hash(data);
    expect(hash1).toBe(hash2);
  });

  test("Node: Different input produces different hash", () => {
    const hash1 = nodeKit.hash(data);
    const hash2 = nodeKit.hash(data + "different");
    expect(hash1).not.toBe(hash2);
  });

  test("Web: Different input produces different hash", async () => {
    const hash1 = await webKit.hash(data);
    const hash2 = await webKit.hash(data + "different");
    expect(hash1).not.toBe(hash2);
  });
});

describe("Hashing - Error Cases", () => {
  test("Node: Fail with empty string", () => {
    const result = nodeKit.tryHash("");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("Web: Fail with empty string", async () => {
    const result = await webKit.tryHash("");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("Node: Fail with whitespace only", () => {
    const result = nodeKit.tryHash("   ");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("Web: Fail with whitespace only", async () => {
    const result = await webKit.tryHash("   ");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("Node: Fail with invalid type (null)", () => {
    // @ts-expect-error Testing invalid input type
    const result = nodeKit.tryHash(null);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("Web: Fail with invalid type (null)", async () => {
    // @ts-expect-error Testing invalid input type
    const result = await webKit.tryHash(null);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("Node: Fail with invalid type (undefined)", () => {
    // @ts-expect-error Testing invalid input type
    const result = nodeKit.tryHash(undefined);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("Web: Fail with invalid type (undefined)", async () => {
    // @ts-expect-error Testing invalid input type
    const result = await webKit.tryHash(undefined);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("Node: Fail with invalid type (number)", () => {
    // @ts-expect-error Testing invalid input type
    const result = nodeKit.tryHash(12345);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("Web: Fail with invalid type (number)", async () => {
    // @ts-expect-error Testing invalid input type
    const result = await webKit.tryHash(12345);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("Hashing - Cross-platform Consistency", () => {
  test("Node and Web produce same hash with SHA-256", async () => {
    const nodeHash = nodeKit.hash(data, { digest: "sha256" });
    const webHash = await webKit.hash(data, { digest: "sha256" });
    expect(nodeHash).toBe(webHash);
  });

  test("Node and Web produce same hash with SHA-384", async () => {
    const nodeHash = nodeKit.hash(data, { digest: "sha384" });
    const webHash = await webKit.hash(data, { digest: "sha384" });
    expect(nodeHash).toBe(webHash);
  });

  test("Node and Web produce same hash with SHA-512", async () => {
    const nodeHash = nodeKit.hash(data, { digest: "sha512" });
    const webHash = await webKit.hash(data, { digest: "sha512" });
    expect(nodeHash).toBe(webHash);
  });

  test("Node and Web return similar errors for empty input", async () => {
    const nodeResult = nodeKit.tryHash("");
    const webResult = await webKit.tryHash("");

    expect(nodeResult.success).toBe(false);
    expect(webResult.success).toBe(false);
    // Both should contain "Empty data" in the message
    expect(nodeResult.error?.message).toContain("Empty data");
    expect(webResult.error?.message).toContain("Empty data");
  });
});

describe("Encoding Conversion - Success Cases", () => {
  test("Node: Convert UTF-8 to Base64", () => {
    const result = nodeKit.convertEncoding(data, "utf8", "base64");
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
  });

  test("Web: Convert UTF-8 to Base64", () => {
    const result = webKit.convertEncoding(data, "utf8", "base64");
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
  });

  test("Node: Convert UTF-8 to Hex", () => {
    const result = nodeKit.convertEncoding(data, "utf8", "hex");
    expect(result).toBeDefined();
    expect(/^[0-9a-f]+$/.test(result)).toBe(true);
  });

  test("Web: Convert UTF-8 to Hex", () => {
    const result = webKit.convertEncoding(data, "utf8", "hex");
    expect(result).toBeDefined();
    expect(/^[0-9a-f]+$/.test(result)).toBe(true);
  });

  test("Node: Convert UTF-8 to Base64URL", () => {
    const result = nodeKit.convertEncoding(data, "utf8", "base64url");
    expect(result).toBeDefined();
    expect(/^[A-Za-z0-9_-]+$/.test(result)).toBe(true);
  });

  test("Web: Convert UTF-8 to Base64URL", () => {
    const result = webKit.convertEncoding(data, "utf8", "base64url");
    expect(result).toBeDefined();
    expect(/^[A-Za-z0-9_-]+$/.test(result)).toBe(true);
  });

  test("Node: Convert UTF-8 to Latin1", () => {
    const simpleData = "Hello World";
    const result = nodeKit.convertEncoding(simpleData, "utf8", "latin1");
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
  });

  test("Web: Convert UTF-8 to Latin1", () => {
    const simpleData = "Hello World";
    const result = webKit.convertEncoding(simpleData, "utf8", "latin1");
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
  });

  test("Node: Round-trip conversion (UTF-8 -> Base64 -> UTF-8)", () => {
    const base64 = nodeKit.convertEncoding(data, "utf8", "base64");
    const back = nodeKit.convertEncoding(base64, "base64", "utf8");
    expect(back).toBe(data);
  });

  test("Web: Round-trip conversion (UTF-8 -> Base64 -> UTF-8)", () => {
    const base64 = webKit.convertEncoding(data, "utf8", "base64");
    const back = webKit.convertEncoding(base64, "base64", "utf8");
    expect(back).toBe(data);
  });

  test("Node: Round-trip conversion (UTF-8 -> Hex -> UTF-8)", () => {
    const hex = nodeKit.convertEncoding(data, "utf8", "hex");
    const back = nodeKit.convertEncoding(hex, "hex", "utf8");
    expect(back).toBe(data);
  });

  test("Web: Round-trip conversion (UTF-8 -> Hex -> UTF-8)", () => {
    const hex = webKit.convertEncoding(data, "utf8", "hex");
    const back = webKit.convertEncoding(hex, "hex", "utf8");
    expect(back).toBe(data);
  });
});

describe("Encoding Conversion - Cross-platform Consistency", () => {
  test("Node and Web produce same Base64 encoding", () => {
    const nodeResult = nodeKit.convertEncoding(data, "utf8", "base64");
    const webResult = webKit.convertEncoding(data, "utf8", "base64");
    expect(nodeResult).toBe(webResult);
  });

  test("Node and Web produce same Hex encoding", () => {
    const nodeResult = nodeKit.convertEncoding(data, "utf8", "hex");
    const webResult = webKit.convertEncoding(data, "utf8", "hex");
    expect(nodeResult).toBe(webResult);
  });

  test("Node and Web produce same Base64URL encoding", () => {
    const nodeResult = nodeKit.convertEncoding(data, "utf8", "base64url");
    const webResult = webKit.convertEncoding(data, "utf8", "base64url");
    expect(nodeResult).toBe(webResult);
  });

  test("Node and Web produce same Latin1 encoding", () => {
    const simpleData = "Hello World";
    const nodeResult = nodeKit.convertEncoding(simpleData, "utf8", "latin1");
    const webResult = webKit.convertEncoding(simpleData, "utf8", "latin1");
    expect(nodeResult).toBe(webResult);
  });
});
