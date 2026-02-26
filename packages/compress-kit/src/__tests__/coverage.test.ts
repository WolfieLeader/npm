import { describe, expect, test } from "vitest";
import { tryCompress, tryDecompress, tryDecompressObj } from "~/index.js";

describe("Compression strategy roundtrips", () => {
  const strategies = ["default", "filtered", "huffmanOnly", "rle", "fixed"] as const;
  const testData = "The quick brown fox jumps over the lazy dog. ".repeat(100);

  for (const strategy of strategies) {
    test(`roundtrips with strategy: ${strategy}`, () => {
      const compressed = tryCompress(testData, { strategy });
      expect(compressed.success).toBe(true);
      const decompressed = tryDecompress(compressed.result as string);
      expect(decompressed.success).toBe(true);
      expect(decompressed.result).toBe(testData);
    });
  }
});

describe("windowBits variations", () => {
  test("roundtrips with windowBits=8 (minimum)", () => {
    // pako silently upgrades windowBits=8 to 9 during deflate,
    // so decompression with the default windowBits=15 handles it correctly
    const testData = "abcdef".repeat(200);
    const compressed = tryCompress(testData, { windowBits: 8 });
    expect(compressed.success).toBe(true);
    const decompressed = tryDecompress(compressed.result as string);
    expect(decompressed.success).toBe(true);
    expect(decompressed.result).toBe(testData);
  });
});

describe("Large payload", () => {
  test("roundtrips large payload (1MB+)", () => {
    const chunk = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(100);
    const largeData = chunk.repeat(200); // ~1.1MB
    const compressed = tryCompress(largeData);
    expect(compressed.success).toBe(true);
    const decompressed = tryDecompress(compressed.result as string);
    expect(decompressed.success).toBe(true);
    expect(decompressed.result).toBe(largeData);
  });
});

describe("maxOutputSize boundary on deflated path", () => {
  test("allows decompressed output exactly at maxOutputSize on .1. path", () => {
    const exactString = "x".repeat(500);
    const compressed = tryCompress(exactString);
    expect(compressed.success).toBe(true);
    if ((compressed.result as string).endsWith(".1.")) {
      const result = tryDecompress(compressed.result as string, { maxOutputSize: 500 });
      expect(result.success).toBe(true);
      expect(result.result).toBe(exactString);
    }
  });
});

describe("decompressObj with non-object JSON", () => {
  test("decompressObj rejects non-object JSON (string)", () => {
    const compressed = tryCompress('"hello"');
    expect(compressed.success).toBe(true);
    const result = tryDecompressObj(compressed.result as string);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("plain object");
  });

  test("decompressObj rejects non-object JSON (array)", () => {
    const compressed = tryCompress("[1,2,3]");
    expect(compressed.success).toBe(true);
    const result = tryDecompressObj(compressed.result as string);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("plain object");
  });
});

describe("Stored .0. path edge cases", () => {
  test("stored .0. path with invalid UTF-8 returns error", () => {
    const invalidUtf8 = new Uint8Array([0xff, 0xfe, 0x80]);
    const b64url = Buffer.from(invalidUtf8).toString("base64url");
    const payload = `${b64url}.0.`;
    const result = tryDecompress(payload);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
