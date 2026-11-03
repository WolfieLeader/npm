import { describe, expect, test } from "vitest";
import { tryCompress, tryCompressObj, tryDecompress, tryDecompressObj } from "~/index.js";
import { DEFLATED, data, largeObj, repeated, smallObj, stored, stringMatching } from "./__helpers__.js";

describe("Compress Test", () => {
  test("Compress Data", () => {
    const compressed = tryCompress(data);
    // Too short to gain from deflate, so it is stored.
    expect(compressed).toStrictEqual({ success: true, result: stored(data) });
    expect((compressed.result as string).endsWith(".0.")).toBe(true);

    const decompressed = tryDecompress(compressed.result as string);
    expect(decompressed).toStrictEqual({ success: true, result: data });
    expect(decompressed.result).toBe(data);
  });
  test("Compress Repeated Data", () => {
    const compressed = tryCompress(repeated);
    expect(compressed).toStrictEqual({ success: true, result: stringMatching(DEFLATED) });
    expect((compressed.result as string).endsWith(".1.")).toBe(true);
    expect((compressed.result as string).length).toBeLessThan(repeated.length);

    const decompressed = tryDecompress(compressed.result as string);
    expect(decompressed).toStrictEqual({ success: true, result: repeated });
    expect(decompressed.result).toBe(repeated);
  });
});

describe("Compress Test: objects", () => {
  test("Compress Small Object", () => {
    const compressed = tryCompressObj(smallObj);
    // Too short to gain from deflate, so it is stored.
    expect(compressed).toStrictEqual({ success: true, result: stored(JSON.stringify(smallObj)) });
    expect((compressed.result as string).endsWith(".0.")).toBe(true);

    const decompressed = tryDecompressObj(compressed.result as string);
    expect(decompressed).toStrictEqual({ success: true, result: smallObj });
    expect(decompressed.result).toStrictEqual(smallObj);
  });

  test("Compress Large Object", () => {
    const compressed = tryCompressObj(largeObj);
    expect(compressed).toStrictEqual({ success: true, result: stringMatching(DEFLATED) });
    expect((compressed.result as string).endsWith(".1.")).toBe(true);
    expect((compressed.result as string).length).toBeLessThan(JSON.stringify(largeObj).length);

    const decompressed = tryDecompressObj(compressed.result as string);
    expect(decompressed).toStrictEqual({ success: true, result: largeObj });
    expect(decompressed.result).toStrictEqual(largeObj);
  });
});
