import { deflateSync } from "node:zlib";
import { describe, expect, test } from "vitest";
import { compress, decompress, tryCompress, tryCompressObj, tryDecompress, tryDecompressObj } from "~/index.js";
import type { CompressOptions, DecompressOptions } from "~/index.js";

const tag = (bytes: Uint8Array): string => `${Buffer.from(bytes).toString("base64url")}.1.`;

const plain = "hello world ".repeat(200);
const full = deflateSync(Buffer.from(plain));
// Flip every bit of the last Adler-32 byte: for a byte value b, 255 - b inverts all 8 bits.
const badAdler = Buffer.concat([full.subarray(0, -1), Buffer.from([255 - full.readUInt8(full.length - 1)])]);

const corrupt: Record<string, string> = {
  garbage: tag(new Uint8Array([0x78, 0x9c, 0xff, 0xff, 0xff, 0xff, 0x00])),
  truncated: tag(full.subarray(0, Math.floor(full.length / 2))),
  "bad Adler-32": tag(badAdler),
  "trailing data": tag(Buffer.concat([full, Buffer.from("JUNKJUNK")])),
  "header only": tag(full.subarray(0, 2)),
};

/** Why each corrupt stream fails: the error description `decompress` returns for it. */
const reasons: Record<string, string> = {
  garbage: "invalid block type",
  truncated: "Compressed stream is truncated (unexpected end of data)",
  "bad Adler-32": "incorrect data check",
  "trailing data": "Found 8 bytes of trailing data after the end of the compressed stream",
  "header only": "Compressed stream is truncated (unexpected end of data)",
};

describe("Rejects corrupt deflate streams", () => {
  const limits: [string, DecompressOptions][] = [
    ["default limit", {}],
    ["maxOutputSize: 100_000", { maxOutputSize: 100_000 }],
    ["maxOutputSize: Infinity", { maxOutputSize: Number.POSITIVE_INFINITY }],
  ];

  for (const [name, payload] of Object.entries(corrupt)) {
    for (const [limitName, options] of limits) {
      test(`${name} (${limitName})`, () => {
        const result = tryDecompress(payload, options);
        expect(result).toStrictEqual({
          success: false,
          error: { message: "decompress: Failed to decompress data", description: reasons[name] },
        });
        expect(result.error?.description).not.toContain("bytesToStr");
      });
    }
  }

  test("truncated stream says it is truncated", () => {
    const result = tryDecompress(corrupt["truncated"] as string);
    expect(result.error?.description).toContain("truncated");
  });

  test("trailing data says so", () => {
    const result = tryDecompress(corrupt["trailing data"] as string);
    expect(result.error?.description).toContain("trailing data");
  });

  test("decompressObj rejects a truncated stream", () => {
    const obj = { a: "x".repeat(500) };
    const compressed = tryCompressObj(obj).result as string;
    const bytes = Buffer.from(compressed.slice(0, -3), "base64url");
    const result = tryDecompressObj(tag(bytes.subarray(0, bytes.length - 6)));
    expect(result.success).toBe(false);
    expect(result.error?.message).toBe("decompress: Failed to decompress data");
  });

  test("decompress throws on corrupt input", () => {
    expect(() => decompress(corrupt["garbage"] as string)).toThrow("Failed to decompress data");
  });

  test("accepts a valid stream produced by node:zlib", () => {
    expect(tryDecompress(tag(full)).result).toBe(plain);
    expect(tryDecompress(tag(full), { maxOutputSize: plain.length }).result).toBe(plain);
  });
});

describe("Default output limit (10 MiB)", () => {
  const tenMiB = 10 * 1024 * 1024;
  const overLimit = tag(deflateSync(Buffer.alloc(tenMiB + 1, 0x41)));
  const atLimit = tag(deflateSync(Buffer.alloc(tenMiB, 0x41)));

  test("rejects deflated output above 10 MiB by default", () => {
    const result = tryDecompress(overLimit);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("exceeds size limit");
    expect(result.error?.description).toContain(String(tenMiB));
  });

  test("allows deflated output of exactly 10 MiB by default", () => {
    const result = tryDecompress(atLimit);
    expect(result.error).toBeUndefined();
    expect(result.result?.length).toBe(tenMiB);
  });

  test("maxOutputSize: Infinity disables the limit", () => {
    const result = tryDecompress(overLimit, { maxOutputSize: Number.POSITIVE_INFINITY });
    expect(result.error).toBeUndefined();
    expect(result.result?.length).toBe(tenMiB + 1);
  });

  test("a larger explicit limit raises it", () => {
    const result = tryDecompress(overLimit, { maxOutputSize: tenMiB + 1 });
    expect(result.error).toBeUndefined();
  });

  test("applies to stored (.0.) payloads", () => {
    const stored = `${Buffer.alloc(tenMiB + 1, 0x41).toString("base64url")}.0.`;
    expect(tryDecompress(stored).error?.message).toContain("exceeds size limit");
    // The same limit through the hex decoder, then with the limit lifted.
    const storedHex = `${Buffer.alloc(tenMiB + 1, 0x41).toString("hex")}.0.`;
    expect(tryDecompress(storedHex, { inputEncoding: "hex" }).error?.message).toContain("exceeds size limit");
    const unlimited = tryDecompress(storedHex, { inputEncoding: "hex", maxOutputSize: Number.POSITIVE_INFINITY });
    expect(unlimited.error).toBeUndefined();
    expect(unlimited.result?.length).toBe(tenMiB + 1);
  });

  test("applies to decompressObj", () => {
    const json = Buffer.from(`{"a":"${"x".repeat(tenMiB)}"}`);
    const payload = tag(deflateSync(json));
    expect(tryDecompressObj(payload).error?.message).toContain("exceeds size limit");
    const ok = tryDecompressObj<{ a: string }>(payload, { maxOutputSize: Number.POSITIVE_INFINITY });
    expect(ok.error).toBeUndefined();
    expect(ok.result?.a.length).toBe(tenMiB);
  });

  test("rejects maxOutputSize: 0 (use Infinity to disable)", () => {
    const result = tryDecompress(atLimit, { maxOutputSize: 0 });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid maxOutputSize");
    expect(result.error?.description).toContain("Infinity");
  });
});

describe("windowBits round-trips", () => {
  const testData = "abcdefghij".repeat(100) + "The quick brown fox jumps over the lazy dog. ".repeat(50);

  for (const windowBits of [8, 9, 10, 11, 12, 13, 14, 15] as NonNullable<CompressOptions["windowBits"]>[]) {
    test(`windowBits=${windowBits} round-trips`, () => {
      const compressed = tryCompress(testData, { windowBits });
      expect(compressed.error).toBeUndefined();
      expect((compressed.result as string).endsWith(".1.")).toBe(true);
      expect(tryDecompress(compressed.result as string).result).toBe(testData);
    });
  }
});

describe("Round-trip and input-size edge cases", () => {
  test("keeps a leading U+FEFF on both the stored and the deflated path", () => {
    for (const data of ["\uFEFFab", `\uFEFF${"a".repeat(200)}`]) {
      expect(tryDecompress(compress(data))).toStrictEqual({ success: true, result: data });
    }
  });

  test("rejects a long run of padding in linear time", () => {
    // A trailing-padding regex here once took seconds: each start position rescanned the whole run.
    const start = performance.now();
    const result = tryDecompress(`${"=".repeat(200_000)}A.0.`);
    expect(performance.now() - start).toBeLessThan(1000);
    expect(result.success).toBe(false);
  });
});
