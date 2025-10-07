import { describe, expect, test } from "vitest";
import { tryCompress, tryCompressObj, tryDecompress, tryDecompressObj } from "~/index";
import { data, largeObj, repeated, smallObj } from "./__helpers__";

describe("Compress Test", () => {
  test("Compress Data", () => {
    const compressed = tryCompress(data);
    expect(compressed.success).toBeTruthy();
    expect(compressed.error).toBeUndefined();
    expect(compressed.result).toBeDefined();
    if ((compressed.result as string).endsWith(".1.")) {
      expect((compressed.result as string).length).toBeLessThan(data.length);
    }

    const decompressed = tryDecompress(compressed.result as string);
    expect(decompressed.success).toBeTruthy();
    expect(decompressed.error).toBeUndefined();
    expect(decompressed.result).toBeDefined();
    expect(decompressed.result).toBe(data);
  });
  test("Compress Repeated Data", () => {
    const compressed = tryCompress(repeated);
    expect(compressed.success).toBeTruthy();
    expect(compressed.error).toBeUndefined();
    expect(compressed.result).toBeDefined();
    if ((compressed.result as string).endsWith(".1.")) {
      expect((compressed.result as string).length).toBeLessThan(repeated.length);
    }

    const decompressed = tryDecompress(compressed.result as string);
    expect(decompressed.success).toBeTruthy();
    expect(decompressed.error).toBeUndefined();
    expect(decompressed.result).toBeDefined();
    expect(decompressed.result).toBe(repeated);
  });
  test("Compress Small Object", () => {
    const compressed = tryCompressObj(smallObj);
    expect(compressed.success).toBeTruthy();
    expect(compressed.error).toBeUndefined();
    expect(compressed.result).toBeDefined();
    if ((compressed.result as string).endsWith(".1.")) {
      expect((compressed.result as string).length).toBeLessThan(JSON.stringify(smallObj).length);
    }

    const decompressed = tryDecompressObj(compressed.result as string);
    expect(decompressed.success).toBeTruthy();
    expect(decompressed.error).toBeUndefined();
    expect(decompressed.result).toBeDefined();
    expect(decompressed.result).toEqual(smallObj);
  });

  test("Compress Large Object", () => {
    const compressed = tryCompressObj(largeObj);
    expect(compressed.success).toBeTruthy();
    expect(compressed.error).toBeUndefined();
    expect(compressed.result).toBeDefined();
    if ((compressed.result as string).endsWith(".1.")) {
      expect((compressed.result as string).length).toBeLessThan(JSON.stringify(largeObj).length);
    }

    const decompressed = tryDecompressObj(compressed.result as string);
    expect(decompressed.success).toBeTruthy();
    expect(decompressed.error).toBeUndefined();
    expect(decompressed.result).toBeDefined();
    expect(decompressed.result).toEqual(largeObj);
  });
});
