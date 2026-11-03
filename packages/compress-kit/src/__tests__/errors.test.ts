import { describe, expect, test } from "vitest";
import { compress, compressObj, decompress, decompressObj, tryCompress, tryDecompress } from "~/index.js";
import type { CompressOptions, DecompressOptions } from "~/index.js";

describe("Compress Error Paths", () => {
  test("rejects empty string", () => {
    const result = tryCompress("");
    expect(result).toStrictEqual({
      success: false,
      error: {
        message: "compress: Data must be a non-empty string",
        description: "Provide a non-empty, non-whitespace string to compress",
      },
    });
  });

  test("rejects whitespace-only string", () => {
    const result = tryCompress("   ");
    expect(result).toStrictEqual({
      success: false,
      error: {
        message: "compress: Data must be a non-empty string",
        description: "Provide a non-empty, non-whitespace string to compress",
      },
    });
  });

  test("rejects invalid options type", () => {
    const result = tryCompress("hello", "bad" as unknown as CompressOptions);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Options must be a plain object");
  });

  test("rejects invalid output encoding", () => {
    const result = tryCompress("hello", { outputEncoding: "utf8" as NonNullable<CompressOptions["outputEncoding"]> });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Unsupported output encoding");
  });

  test("rejects invalid compression level", () => {
    const result = tryCompress("hello", { level: 0 as NonNullable<CompressOptions["level"]> });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid level");
  });

  test("rejects level above 9", () => {
    const result = tryCompress("hello", { level: 10 as NonNullable<CompressOptions["level"]> });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid level");
  });

  test("rejects invalid windowBits", () => {
    const result = tryCompress("hello", { windowBits: 7 as NonNullable<CompressOptions["windowBits"]> });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid windowBits");
  });
});

describe("Compress Error Paths: memLevel and strategy", () => {
  test("rejects invalid memLevel", () => {
    const result = tryCompress("hello", { memLevel: 0 as NonNullable<CompressOptions["memLevel"]> });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid memLevel");
  });

  test("rejects invalid strategy", () => {
    const result = tryCompress("hello", { strategy: "bogus" as NonNullable<CompressOptions["strategy"]> });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid strategy");
  });

  test("rejects inherited strategy key", () => {
    const result = tryCompress("hello", { strategy: "toString" as NonNullable<CompressOptions["strategy"]> });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid strategy");
  });
});

describe("Decompress Error Paths", () => {
  test("rejects empty string", () => {
    const result = tryDecompress("");
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid compressed data format");
  });

  test("rejects string without format suffix", () => {
    const result = tryDecompress("SGVsbG8gd29ybGQ");
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid compressed data format");
  });

  test("rejects too-short string", () => {
    const result = tryDecompress("ab.");
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid compressed data format");
  });

  test("rejects invalid options type", () => {
    const compressed = tryCompress("hello");
    expect(compressed.success).toBe(true);
    const result = tryDecompress(compressed.result as string, null as unknown as DecompressOptions);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Options must be a plain object");
  });
});

describe("Decompress Error Paths: options and payloads", () => {
  test("rejects invalid input encoding", () => {
    const compressed = tryCompress("hello");
    expect(compressed.success).toBe(true);
    const result = tryDecompress(compressed.result as string, {
      inputEncoding: "utf8" as NonNullable<DecompressOptions["inputEncoding"]>,
    });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Unsupported input encoding");
  });

  test("handles corrupt compressed data", () => {
    const result = tryDecompress("dGhpcyBpcyBub3QgY29tcHJlc3NlZA.1.");
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Failed to decompress");
  });

  test("handles .0. suffix (uncompressed passthrough)", () => {
    const compressed = tryCompress("hi");
    expect(compressed.success).toBe(true);
    expect((compressed.result as string).endsWith(".0.")).toBe(true);
    const result = tryDecompress(compressed.result as string);
    expect(result.success).toBe(true);
    expect(result.result).toBe("hi");
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

  test("enforces maxOutputSize on .0. (uncompressed) path", () => {
    const shortString = "hi";
    const compressed = tryCompress(shortString);
    expect(compressed.success).toBe(true);
    expect((compressed.result as string).endsWith(".0.")).toBe(true);

    const result = tryDecompress(compressed.result as string, { maxOutputSize: 1 });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("exceeds size limit");
  });

  test("rejects oversized .0. payload before full decode", () => {
    const payload = `${"a".repeat(80)}.0.`;
    const result = tryDecompress(payload, { maxOutputSize: 20 });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("exceeds size limit");
  });
});

describe("Decompress maxOutputSize validation", () => {
  test("rejects maxOutputSize: 0 (no longer means unlimited)", () => {
    const longString = "x".repeat(10_000);
    const compressed = tryCompress(longString);
    expect(compressed.success).toBe(true);

    const result = tryDecompress(compressed.result as string, { maxOutputSize: 0 });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid maxOutputSize");
  });

  test("aborts decompression early on large payload exceeding limit", () => {
    const largeString = "abcdefghij".repeat(50_000);
    const compressed = tryCompress(largeString);
    expect(compressed.success).toBe(true);
    expect((compressed.result as string).endsWith(".1.")).toBe(true);

    const result = tryDecompress(compressed.result as string, { maxOutputSize: 100 });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("exceeds size limit");
  });

  test("accepts maxOutputSize: Infinity (no limit)", () => {
    const result = tryDecompress("aGk.0.", { maxOutputSize: Number.POSITIVE_INFINITY });
    expect(result.success).toBe(true);
    expect(result.result).toBe("hi");
  });

  test("rejects maxOutputSize: -Infinity", () => {
    const result = tryDecompress("aGk.0.", { maxOutputSize: Number.NEGATIVE_INFINITY });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid maxOutputSize");
  });

  test("rejects maxOutputSize: 1.5", () => {
    const result = tryDecompress("aGk.0.", { maxOutputSize: 1.5 });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid maxOutputSize");
  });

  test("rejects maxOutputSize: NaN", () => {
    const result = tryDecompress("data.0.", { maxOutputSize: Number.NaN });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid maxOutputSize");
  });

  test("rejects maxOutputSize: -1", () => {
    const result = tryDecompress("data.0.", { maxOutputSize: -1 });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid maxOutputSize");
  });
});

describe("Decompress malformed UTF-8 with maxOutputSize", () => {
  test("returns error instead of throwing for non-UTF-8 data with maxOutputSize", async () => {
    const pako = await import("pako");
    const invalidUtf8 = new Uint8Array([0xff, 0xfe, 0x80, 0x81, 0x82, 0x83, 0x84, 0x85]);
    const compressed = pako.deflate(invalidUtf8);
    const b64 = Buffer.from(compressed).toString("base64url");
    const payload = `${b64}.1.`;

    const result = tryDecompress(payload, { maxOutputSize: 1000 });
    expect(result).toStrictEqual({
      success: false,
      error: {
        message: "decompress: Failed to decode output",
        description: "The encoded data was not valid for encoding utf-8",
      },
    });
  });

  test("returns error instead of throwing for trailing incomplete UTF-8 with maxOutputSize", async () => {
    const pako = await import("pako");
    // Valid ASCII followed by an incomplete 3-byte UTF-8 sequence (leading byte 0xe0 with no continuation)
    const trailingIncomplete = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0xe0, 0xa0]);
    const compressed = pako.deflate(trailingIncomplete);
    const b64 = Buffer.from(compressed).toString("base64url");
    const payload = `${b64}.1.`;

    const result = tryDecompress(payload, { maxOutputSize: 1000 });
    expect(result).toStrictEqual({
      success: false,
      error: {
        message: "decompress: Failed to decode output",
        description: "The encoded data was not valid for encoding utf-8",
      },
    });
    expect(result.error?.message).toContain("Failed to decode output");
  });

  test("allows output exactly at maxOutputSize boundary", () => {
    const exactString = "x".repeat(100);
    const compressed = tryCompress(exactString);
    expect(compressed.success).toBe(true);

    const result = tryDecompress(compressed.result as string, { maxOutputSize: 100 });
    expect(result.success).toBe(true);
    expect(result.result).toBe(exactString);
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

describe("Throwing: compress", () => {
  test("throws on empty string", () => {
    expect(() => compress("")).toThrow("Data must be a non-empty string");
  });

  test("throws on non-string input", () => {
    expect(() => compress(123 as unknown as string)).toThrow("Data must be a non-empty string");
  });
});

describe("Throwing: decompress", () => {
  test("throws on invalid format", () => {
    expect(() => decompress("invalid")).toThrow("Invalid compressed data format");
  });

  test("throws on corrupt compressed data", () => {
    expect(() => decompress("dGhpcyBpcyBub3QgY29tcHJlc3NlZA.1.")).toThrow("Failed to decompress");
  });
});

describe("Throwing: roundtrip", () => {
  test("compress/decompress roundtrip", () => {
    const original = "Hello world! ".repeat(50);
    expect(decompress(compress(original))).toBe(original);
  });

  test("compress/decompress short string roundtrip (.0. path)", () => {
    const original = "hi";
    const compressed = compress(original);
    expect(compressed.endsWith(".0.")).toBe(true);
    expect(decompress(compressed)).toBe(original);
  });

  test("compressObj/decompressObj roundtrip", () => {
    const obj = { key: "value", nested: { a: 1 } };
    expect(decompressObj(compressObj(obj))).toStrictEqual(obj);
  });
});

describe("Throwing: compressObj", () => {
  test("throws on non-POJO input", () => {
    expect(() => compressObj([])).toThrow("stringifyObj: Input must be a plain object");
  });
});

describe("Hostile option values return an error that does not echo them", () => {
  const sym = Symbol("bad");

  test("tryCompress with a symbol level", () => {
    const result = tryCompress("hello", { level: sym as unknown as NonNullable<CompressOptions["level"]> });
    expect(result.error?.message).toBe("compress: Invalid level");
  });

  test("tryCompress with a symbol outputEncoding", () => {
    const result = tryCompress("hello", {
      outputEncoding: sym as unknown as NonNullable<CompressOptions["outputEncoding"]>,
    });
    expect(result.error?.message).toBe("compress: Unsupported output encoding");
  });

  test("tryCompress with a symbol strategy", () => {
    const result = tryCompress("hello", { strategy: sym as unknown as NonNullable<CompressOptions["strategy"]> });
    expect(result.error?.message).toBe("compress: Invalid strategy");
  });

  test("tryDecompress with a symbol inputEncoding", () => {
    const result = tryDecompress("aGk.0.", {
      inputEncoding: sym as unknown as NonNullable<DecompressOptions["inputEncoding"]>,
    });
    expect(result.error?.message).toBe("decompress: Unsupported input encoding");
  });

  test("tryCompress with a prototype-less object level", () => {
    // String() throws on an object with no toString, so an echoed value used to escape the Result.
    const level = Object.create(null) as NonNullable<CompressOptions["level"]>;
    expect(tryCompress("hello", { level }).error?.message).toBe("compress: Invalid level");
  });
});
