import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import { tryCompress, tryCompressObj, tryDecompress, tryDecompressObj } from "~/index.js";
import type { CompressOptions, DecompressOptions } from "~/index.js";

// Any code point, without lone surrogates. Uniform code points almost never hit the characters that broke
// codecs before (a leading U+FEFF was dropped), so half the characters come from a list of edge cases.
const edgeChar = fc.constantFrom("\uFEFF", "\u0000", "\uFFFD", "\u{10FFFF}", "=", ".", "\r\n");
const anyText = fc.string({ unit: fc.oneof(fc.string({ unit: "binary", minLength: 1, maxLength: 1 }), edgeChar) });
const anyValue = fc.anything({
  withNullPrototype: true,
  withBigInt: true,
  withMap: true,
  withSet: true,
  withDate: true,
});
const SENTINEL = "SENTINEL-7f3a";
const hostile = fc.oneof(anyValue, fc.constant(SENTINEL), fc.constant(Object.create(null) as unknown));
const anyEncoding = fc.constantFrom("base64", "base64url", "hex" as const);

describe("compress-kit properties", () => {
  test("any accepted string round-trips through every encoding, short (stored) and long (deflated)", () => {
    // compress rejects empty and whitespace-only strings by design.
    const accepted = anyText.filter((t) => t.trim() !== "");
    const shortOrLong = fc.oneof(
      accepted,
      accepted.map((t) => t.repeat(40)),
    );
    fc.assert(
      fc.property(shortOrLong, anyEncoding, (text, encoding) => {
        const compressed = tryCompress(text, { outputEncoding: encoding });
        expect(compressed.success).toBe(true);
        const restored = tryDecompress(compressed.result as string, { inputEncoding: encoding });
        expect(restored).toStrictEqual({ success: true, result: text });
      }),
    );
  });

  test("whatever compressObj accepts, decompressObj reads back unchanged", () => {
    const jsonObject = fc.dictionary(fc.string(), fc.jsonValue());
    fc.assert(
      fc.property(jsonObject, (obj) => {
        const compressed = tryCompressObj(obj);
        fc.pre(compressed.success);
        const restored = tryDecompressObj(compressed.result);
        expect(tryCompressObj(restored.result as object)).toStrictEqual(compressed);
      }),
    );
  });

  test("hostile input or options return a Result that never echoes them", () => {
    const optionKeys = [
      "level",
      "windowBits",
      "memLevel",
      "strategy",
      "outputEncoding",
      "inputEncoding",
      "maxOutputSize",
    ];
    fc.assert(
      fc.property(hostile, fc.constantFrom(...optionKeys), hostile, (data, key, value) => {
        const options = { [key]: value };
        const results = [
          tryCompress(data as string, options),
          tryDecompress(data as string, options),
          tryCompressObj(data as object, options as CompressOptions),
          tryDecompressObj(data as string, options as DecompressOptions),
        ];
        for (const result of results) {
          expect(typeof result.success).toBe("boolean");
          expect(JSON.stringify(result.error ?? null)).not.toContain(SENTINEL);
        }
      }),
    );
  });
});
