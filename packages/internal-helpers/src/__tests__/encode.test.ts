import { describe, expect, test } from "vitest";
import {
  $convertBytesToStr,
  $convertStrToBytes,
  $fromBase64,
  $fromBase64Url,
  $fromHex,
  $fromLatin1,
  $newStrictUtf8Decoder,
  $toBase64,
  $toBase64Url,
  $toHex,
  $toLatin1,
  bytesToStr,
  strToBytes,
  textEncoder,
} from "~/encode.js";
import type { Encoding } from "~/encode.js";

const ascii = "Hello, World!";
const unicode = "Héllo, Wörld! 🌍🚀 日本語テスト";

const latin1Bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
const largeBinary = Uint8Array.from({ length: 40_000 }, (_, i) => i % 256);

describe("Latin1", () => {
  test("roundtrips ASCII", () => {
    const bytes = $fromLatin1(ascii);
    expect($toLatin1(bytes)).toBe(ascii);
  });

  test("roundtrips full 0–255 range", () => {
    const str = $toLatin1(latin1Bytes);
    const back = $fromLatin1(str);
    expect(back).toStrictEqual(latin1Bytes);
  });

  test("handles empty input", () => {
    expect($toLatin1(new Uint8Array())).toBe("");
    expect($fromLatin1("")).toStrictEqual(new Uint8Array());
  });

  test("$fromLatin1 throws on char > 255", () => {
    expect(() => $fromLatin1("café☕")).toThrow("Invalid latin1 string");
  });

  test("$toLatin1 chunks correctly with >32KB data", () => {
    const str = $toLatin1(largeBinary);
    expect(str.length).toBe(40_000);
    const back = $fromLatin1(str);
    expect(back).toStrictEqual(largeBinary);
  });
});

describe("Base64", () => {
  test("roundtrips bytes", () => {
    const bytes = textEncoder.encode(ascii);
    expect($fromBase64($toBase64(bytes))).toStrictEqual(bytes);
  });

  test("known vector: Hello, World!", () => {
    const bytes = textEncoder.encode("Hello, World!");
    expect($toBase64(bytes)).toBe("SGVsbG8sIFdvcmxkIQ==");
  });

  test("handles empty input", () => {
    expect($toBase64(new Uint8Array())).toBe("");
    expect($fromBase64("")).toStrictEqual(new Uint8Array());
  });

  test("roundtrips full byte range", () => {
    const encoded = $toBase64(latin1Bytes);
    expect($fromBase64(encoded)).toStrictEqual(latin1Bytes);
  });

  test("rejects whitespace in base64", () => {
    expect(() => $fromBase64("A B==")).toThrow("Invalid base64 string");
  });

  test("rejects invalid characters in base64", () => {
    expect(() => $fromBase64("SGVs!bG8=")).toThrow("Invalid base64 string");
  });
});

describe("Base64URL", () => {
  test("matches Node's unpadded base64url for every padding length", () => {
    for (let length = 0; length <= 6; length++) {
      const bytes = Uint8Array.from({ length }, (_, i) => 250 + i);
      expect($toBase64Url(bytes)).toBe(Buffer.from(bytes).toString("base64url"));
    }
  });

  test("roundtrips bytes", () => {
    const bytes = textEncoder.encode(ascii);
    expect($fromBase64Url($toBase64Url(bytes))).toStrictEqual(bytes);
  });

  test("output contains no +, /, or =", () => {
    const encoded = $toBase64Url(latin1Bytes);
    expect(encoded).not.toContain("+");
    expect(encoded).not.toContain("/");
    expect(encoded).not.toContain("=");
  });

  test("correctly encodes bytes that produce + and / in standard base64", () => {
    const bytes = new Uint8Array([0xfb, 0xff, 0xfe]);
    const standard = $toBase64(bytes);
    expect(standard).toContain("+");
    expect(standard).toContain("/");

    const urlSafe = $toBase64Url(bytes);
    expect(urlSafe).not.toContain("+");
    expect(urlSafe).not.toContain("/");
    expect($fromBase64Url(urlSafe)).toStrictEqual(bytes);
  });

  test("rejects + character (not valid in base64url)", () => {
    expect(() => $fromBase64Url("abc+def")).toThrow("Invalid base64url string");
  });

  test("rejects / character (not valid in base64url)", () => {
    expect(() => $fromBase64Url("abc/def")).toThrow("Invalid base64url string");
  });
});

describe("Hex", () => {
  test("roundtrips bytes", () => {
    const bytes = textEncoder.encode(ascii);
    expect($fromHex($toHex(bytes))).toStrictEqual(bytes);
  });

  test("output is lowercase", () => {
    const hex = $toHex(new Uint8Array([0xab, 0xcd, 0xef]));
    expect(hex).toBe("abcdef");
  });

  test("known vector", () => {
    expect($toHex(new Uint8Array([0, 255, 16]))).toBe("00ff10");
  });

  test("strips 0x prefix", () => {
    const bytes = $fromHex("0x00ff10");
    expect(bytes).toStrictEqual(new Uint8Array([0, 255, 16]));
  });

  test("strips 0X prefix", () => {
    const bytes = $fromHex("0X00ff10");
    expect(bytes).toStrictEqual(new Uint8Array([0, 255, 16]));
  });

  test("throws on odd-length string", () => {
    expect(() => $fromHex("abc")).toThrow("Invalid hex string");
  });

  test("throws on invalid hex chars", () => {
    expect(() => $fromHex("zzzz")).toThrow("Invalid hex string");
  });

  test("throws on partial-invalid hex pairs", () => {
    expect(() => $fromHex("0g1a")).toThrow("Invalid hex string");
    expect($fromHex("fa")).toStrictEqual(new Uint8Array([0xfa]));
  });

  test("handles empty input", () => {
    expect($toHex(new Uint8Array())).toBe("");
    expect($fromHex("")).toStrictEqual(new Uint8Array());
  });
});

describe("$convertStrToBytes", () => {
  test("defaults to utf8", () => {
    const result = $convertStrToBytes(ascii);
    expect(result).toStrictEqual({ success: true, result: textEncoder.encode(ascii) });
  });

  test("converts each encoding", () => {
    const hex = $toHex(textEncoder.encode(ascii));
    const result = $convertStrToBytes(hex, "hex");
    expect(result).toStrictEqual({ success: true, result: textEncoder.encode(ascii) });
  });

  test("succeeds for empty string", () => {
    const result = $convertStrToBytes("");
    expect(result).toStrictEqual({ success: true, result: new Uint8Array() });
  });

  test("fails for non-string input", () => {
    const result = $convertStrToBytes(42 as unknown as string);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Data must be a string");
  });

  test("succeeds for whitespace-only string", () => {
    const result = $convertStrToBytes("   ", "utf8");
    expect(result).toStrictEqual({ success: true, result: textEncoder.encode("   ") });
  });

  test("fails for invalid encoding", () => {
    const result = $convertStrToBytes("data", "nope" as "utf8");
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Unsupported encoding");
  });
});

describe("$convertBytesToStr", () => {
  test("defaults to utf8", () => {
    const bytes = textEncoder.encode(ascii);
    const result = $convertBytesToStr(bytes);
    expect(result).toStrictEqual({ success: true, result: ascii });
  });

  test("converts each encoding", () => {
    const bytes = textEncoder.encode(ascii);
    const result = $convertBytesToStr(bytes, "hex");
    expect(result).toStrictEqual({ success: true, result: $toHex(bytes) });
  });

  test("accepts ArrayBuffer", () => {
    const bytes = textEncoder.encode(ascii);
    const result = $convertBytesToStr(bytes.buffer, "utf8");
    expect(result).toStrictEqual({ success: true, result: ascii });
  });

  test("fails for non-buffer input", () => {
    const result = $convertBytesToStr("not bytes" as unknown as ArrayBuffer);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Data must be an ArrayBuffer or Uint8Array");
  });

  test("fails for invalid encoding", () => {
    const result = $convertBytesToStr(new Uint8Array([1]), "nope" as unknown as Encoding);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Unsupported encoding");
  });

  test("fails for invalid UTF-8 bytes", () => {
    const invalidUtf8 = new Uint8Array([0xff, 0xfe, 0x80]);
    const result = $convertBytesToStr(invalidUtf8, "utf8");
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Failed to convert data");
  });
});

describe("Encoding roundtrips", () => {
  const encodings = ["base64", "base64url", "hex", "utf8", "latin1"] as const;

  for (const encoding of encodings) {
    test(`roundtrips via ${encoding}`, () => {
      const original = ascii;
      const toBytes = $convertStrToBytes(original, "utf8");
      expect(toBytes.success).toBe(true);
      if (!toBytes.success) return;

      const encoded = $convertBytesToStr(toBytes.result, encoding);
      expect(encoded.success).toBe(true);
      if (!encoded.success) return;

      const decoded = $convertStrToBytes(encoded.result, encoding);
      expect(decoded.success).toBe(true);
      if (!decoded.success) return;

      const back = $convertBytesToStr(decoded.result, "utf8");
      expect(back).toStrictEqual({ success: true, result: original });
    });
  }

  test("roundtrips unicode via utf8", () => {
    const toBytes = $convertStrToBytes(unicode, "utf8");
    expect(toBytes.success).toBe(true);
    if (!toBytes.success) return;

    const back = $convertBytesToStr(toBytes.result, "utf8");
    expect(back).toStrictEqual({ success: true, result: unicode });
  });
});

describe("Full byte range encoding roundtrips", () => {
  const allBytes = Uint8Array.from({ length: 256 }, (_, i) => i);

  for (const encoding of ["base64", "base64url", "hex", "latin1"] as const) {
    test(`roundtrips 0-255 via ${encoding}`, () => {
      const encoded = bytesToStr[encoding](allBytes);
      const decoded = strToBytes[encoding](encoded);
      expect(decoded).toStrictEqual(allBytes);
    });
  }
});

describe("$newStrictUtf8Decoder", () => {
  test("keeps a leading U+FEFF and rejects invalid UTF-8", () => {
    expect($newStrictUtf8Decoder().decode(textEncoder.encode("\uFEFFab"))).toBe("\uFEFFab");
    expect(() => $newStrictUtf8Decoder().decode(Uint8Array.of(0xff))).toThrow(TypeError);
  });

  test("returns a fresh instance, so an aborted stream cannot leak bytes into the next decode", () => {
    const aborted = $newStrictUtf8Decoder();
    aborted.decode(Uint8Array.of(0xe2, 0x82), { stream: true });
    expect($newStrictUtf8Decoder().decode(textEncoder.encode("ok"))).toBe("ok");
  });
});
