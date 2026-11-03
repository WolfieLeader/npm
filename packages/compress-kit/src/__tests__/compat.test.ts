import { describe, expect, test } from "vitest";
import { tryDecompress, tryDecompressObj } from "~/index.js";
import type { DecompressOptions } from "~/index.js";

// Fixed outputs produced by compress-kit 3.0.0 (pako 2.1.0) before the pako 3 upgrade.
// compress-kit 2.0.0 produces byte-identical strings for the same inputs.
// Every future version must keep decompressing them.
const text =
  "Hēl!0, the quick brown fox (🦊) jumps over the lazy dog (🐶). Hēl!0, the quick brown fox (🦊) jumps over the lazy dog (🐶). Hēl!0, the quick brown fox (🦊) jumps over the lazy dog (🐶). Hēl!0, the quick brown fox (🦊) jumps over the lazy dog (🐶). ";

const v3Fixtures: Record<string, [string, DecompressOptions?]> = {
  default: ["eJzzODI5R9FAR6EkI1WhsDQzOVshqSi_PE8hLb9CQePD_GVdmgpZpbkFxQr5ZalFYFU5iVWVCin56SDpCds09RQ8hosRAEGpZZU.1."],
  hex: [
    "789cf338323947d14047a1242355a1b03433395b21a928bf3c4f212dbf4241e3c3fc655d9a0a59a5b905c50af965a9456055398955950a29f9e920e909db34f5143c868b110041a96595.1.",
    { inputEncoding: "hex" },
  ],
  base64: [
    "eJzzODI5R9FAR6EkI1WhsDQzOVshqSi/PE8hLb9CQePD/GVdmgpZpbkFxQr5ZalFYFU5iVWVCin56SDpCds09RQ8hosRAEGpZZU=.1.",
    { inputEncoding: "base64" },
  ],
  wb8: ["GJXzODI5R9FAR6EkI1WhsDQzOVshqSi_PE8hLb9CQePD_GVdmgpZpbkFxQr5ZalFYFU5iVWVCin56SDpCds09RQ8hosRAEGpZZU.1."],
  wb9: ["GJXzODI5R9FAR6EkI1WhsDQzOVshqSi_PE8hLb9CQePD_GVdmgpZpbkFxQr5ZalFYFU5iVWVCin56SDpCds09RQ8hosRAEGpZZU.1."],
  wb10: ["KJHzODI5R9FAR6EkI1WhsDQzOVshqSi_PE8hLb9CQePD_GVdmgpZpbkFxQr5ZalFYFU5iVWVCin56SDpCds09RQ8hosRAEGpZZU.1."],
  wb11: ["OI3zODI5R9FAR6EkI1WhsDQzOVshqSi_PE8hLb9CQePD_GVdmgpZpbkFxQr5ZalFYFU5iVWVCin56SDpCds09RQ8hosRAEGpZZU.1."],
  wb12: ["SInzODI5R9FAR6EkI1WhsDQzOVshqSi_PE8hLb9CQePD_GVdmgpZpbkFxQr5ZalFYFU5iVWVCin56SDpCds09RQ8hosRAEGpZZU.1."],
  wb13: ["WIXzODI5R9FAR6EkI1WhsDQzOVshqSi_PE8hLb9CQePD_GVdmgpZpbkFxQr5ZalFYFU5iVWVCin56SDpCds09RQ8hosRAEGpZZU.1."],
  wb14: ["aIHzODI5R9FAR6EkI1WhsDQzOVshqSi_PE8hLb9CQePD_GVdmgpZpbkFxQr5ZalFYFU5iVWVCin56SDpCds09RQ8hosRAEGpZZU.1."],
  wb15: ["eJzzODI5R9FAR6EkI1WhsDQzOVshqSi_PE8hLb9CQePD_GVdmgpZpbkFxQr5ZalFYFU5iVWVCin56SDpCds09RQ8hosRAEGpZZU.1."],
  level1: ["eAHzODI5R9FAR6EkI1WhsDQzOVshqSi_PE8hLb9CQePD_GVdmgpZpbkFxQr5ZalFYFU5iVWVCin56SDpCds09RQ8hosRAEGpZZU.1."],
  level9: ["eNrzODI5R9FAR6EkI1WhsDQzOVshqSi_PE8hLb9CQePD_GVdmgpZpbkFxQr5ZalFYFU5iVWVCin56SDpCds09RQ8hosRAEGpZZU.1."],
  filtered: [
    "eJzzODI5R9FAR6EkI1WhsDQzOVshqSi_PE8hLb9CQePD_GVdmgpZpbkFxQr5ZalFCiUZqQo5iVWVCin56QoaH-ZP2Kapp-AxXIwAAEGpZZU.1.",
  ],
  huffmanOnly: [
    "eAEFwdsRRTAUBdBWtr9kxhhlaMPjEOQ6ROJVgi8zCsifElSgoJRw18q-W0dpDKsIk2vLHoXhdUDNG0TwzynRud84gxcysIqg82NHxQ1E8NcrE2TfraM0hlWEybVlj8LwOqDmDSL455To3G-cwQsZWEXQ-bGj4gYi-OuVCbLv1lEawyrC5NqyR2F4HVDzBhH8c0p07jfO4IUMrCLo_NhRcQMR_PXKBNl36yiNYRVhcm3ZozC8Dqh5gwj-OSU69xtn8EIGVhF0fuyouIEI_nplgj9BqWWV.1.",
  ],
  rle: [
    "eAEFwdsRRTAUBdBWtr9kxhhlaMPjEOQ6ROJVgi8zCsifElSgoJRw18q-W0dpDKsIk2vLHoXhdUDNG0TwzynRud84gxcysIqg82NHxQ1E8NcrE2TfraM0hlWEybVlj8LwOqDmDSL455To3G-cwQsZWEXQ-bGj4gYi-OuVCbLv1lEawyrC5NqyR2F4HVDzBhH8c0p07jfO4IUMrCLo_NhRcQMR_PXKBNl36yiNYRVhcm3ZozC8Dqh5gwj-OSU69xtn8EIGVhF0fuyouIEI_nplgj9BqWWV.1.",
  ],
  fixed: ["eAHzODI5R9FAR6EkI1WhsDQzOVshqSi_PE8hLb9CQePD_GVdmgpZpbkFxQr5ZalFYFU5iVWVCin56SDpCds09RQ8hosRAEGpZZU.1."],
};

describe("Decompresses compress-kit 2.x/3.x outputs", () => {
  for (const [name, [compressed, options]] of Object.entries(v3Fixtures)) {
    test(`fixture: ${name}`, () => {
      const result = tryDecompress(compressed, options);
      expect(result.error).toBeUndefined();
      expect(result.result).toBe(text);
    });
  }

  test("fixture: a windowBits 8 output decompresses, and a v3 caller's stray decompress windowBits is ignored", () => {
    const wb8 = v3Fixtures["wb8"]?.[0] as string;
    expect(tryDecompress(wb8).result).toBe(text);
    const v3CallerOptions = { windowBits: 9 } as unknown as DecompressOptions;
    expect(tryDecompress(wb8, v3CallerOptions).result).toBe(text);
  });

  test("fixture: stored (.0.)", () => {
    const result = tryDecompress("aGkg8J-mig.0.");
    expect(result.error).toBeUndefined();
    expect(result.result).toBe("hi 🦊");
  });

  test("fixture: object", () => {
    const result = tryDecompressObj(
      "eJyrVspIzcnJV7JSKs8vyklR0lHKU7IyMQJSqcUlqSlKVtVKiUVFSlbRhjpGOsaxOkr52UpWJUWlqbU6SgWJQHmlCiKBUi0AjI4nKg.1.",
    );
    expect(result.error).toBeUndefined();
    expect(result.result).toStrictEqual({
      hello: "world",
      n: 42,
      nested: { arr: [1, 2, 3], ok: true },
      pad: "x".repeat(40),
    });
  });
});
