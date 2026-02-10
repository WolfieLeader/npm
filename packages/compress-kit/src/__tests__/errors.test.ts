import { describe, expect, test } from "vitest";
import { tryCompress, tryDecompress } from "~/index.js";

describe("Compress Error Paths", () => {
  test("rejects empty string", () => {
    const result = tryCompress("");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("rejects whitespace-only string", () => {
    const result = tryCompress("   ");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("rejects invalid options type", () => {
    const result = tryCompress("hello", "bad" as any);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid options");
  });

  test("rejects invalid output encoding", () => {
    const result = tryCompress("hello", { outputEncoding: "utf8" as any });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid output encoding");
  });

  test("rejects invalid compression level", () => {
    const result = tryCompress("hello", { level: 0 as any });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid level");
  });

  test("rejects level above 9", () => {
    const result = tryCompress("hello", { level: 10 as any });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid level");
  });

  test("rejects invalid windowBits", () => {
    const result = tryCompress("hello", { windowBits: 7 as any });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid windowBits");
  });

  test("rejects invalid memLevel", () => {
    const result = tryCompress("hello", { memLevel: 0 as any });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid memLevel");
  });

  test("rejects invalid strategy", () => {
    const result = tryCompress("hello", { strategy: "bogus" as any });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid strategy");
  });
});

describe("Decompress Error Paths", () => {
  test("rejects empty string", () => {
    const result = tryDecompress("");
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid format");
  });

  test("rejects string without format suffix", () => {
    const result = tryDecompress("SGVsbG8gd29ybGQ");
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid format");
  });

  test("rejects too-short string", () => {
    const result = tryDecompress("ab.");
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid format");
  });

  test("rejects invalid options type", () => {
    const compressed = tryCompress("hello");
    expect(compressed.success).toBe(true);
    const result = tryDecompress(compressed.result as string, null as any);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid options");
  });

  test("rejects invalid input encoding", () => {
    const compressed = tryCompress("hello");
    expect(compressed.success).toBe(true);
    const result = tryDecompress(compressed.result as string, { inputEncoding: "utf8" as any });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid input encoding");
  });

  test("rejects invalid windowBits", () => {
    const compressed = tryCompress("hello");
    expect(compressed.success).toBe(true);
    const result = tryDecompress(compressed.result as string, { windowBits: 7 as any });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid windowBits");
  });

  test("handles corrupt compressed data", () => {
    const result = tryDecompress("dGhpcyBpcyBub3QgY29tcHJlc3NlZA.1.");
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Failed to decompress");
  });

  test("handles .0. suffix (uncompressed passthrough)", () => {
    const compressed = tryCompress("hi");
    expect(compressed.success).toBe(true);
    if ((compressed.result as string).endsWith(".0.")) {
      const result = tryDecompress(compressed.result as string);
      expect(result.success).toBe(true);
      expect(result.result).toBe("hi");
    }
  });
});

describe("Decompress maxOutputSize", () => {
  test("rejects output exceeding maxOutputSize", () => {
    const longString = "x".repeat(10_000);
    const compressed = tryCompress(longString);
    expect(compressed.success).toBe(true);

    const result = tryDecompress(compressed.result as string, { maxOutputSize: 100 });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("exceeds size limit");
  });

  test("allows output within maxOutputSize", () => {
    const shortString = "hello world";
    const compressed = tryCompress(shortString);
    expect(compressed.success).toBe(true);

    const result = tryDecompress(compressed.result as string, { maxOutputSize: 1_000_000 });
    expect(result.success).toBe(true);
    expect(result.result).toBe(shortString);
  });
});

describe("Compression strategies and encodings", () => {
  const testData = "The quick brown fox jumps over the lazy dog. ".repeat(100);

  test("works with hex encoding", () => {
    const compressed = tryCompress(testData, { outputEncoding: "hex" });
    expect(compressed.success).toBe(true);
    const decompressed = tryDecompress(compressed.result as string, { inputEncoding: "hex" });
    expect(decompressed.success).toBe(true);
    expect(decompressed.result).toBe(testData);
  });

  test("works with base64 encoding", () => {
    const compressed = tryCompress(testData, { outputEncoding: "base64" });
    expect(compressed.success).toBe(true);
    const decompressed = tryDecompress(compressed.result as string, { inputEncoding: "base64" });
    expect(decompressed.success).toBe(true);
    expect(decompressed.result).toBe(testData);
  });

  test("works with different compression levels", () => {
    const compressed1 = tryCompress(testData, { level: 1 });
    const compressed9 = tryCompress(testData, { level: 9 });
    expect(compressed1.success).toBe(true);
    expect(compressed9.success).toBe(true);
    expect(tryDecompress(compressed1.result as string).result).toBe(testData);
    expect(tryDecompress(compressed9.result as string).result).toBe(testData);
  });

  test("works with filtered strategy", () => {
    const compressed = tryCompress(testData, { strategy: "filtered" });
    expect(compressed.success).toBe(true);
    expect(tryDecompress(compressed.result as string).result).toBe(testData);
  });
});
