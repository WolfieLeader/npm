import { describe, expect, test } from "vitest";
import {
  $convertBytesToStr,
  $convertStrToBytes,
  $fromBase64,
  $fromBase64Url,
  $fromHex,
  $fromLatin1,
  $toBase64,
  $toBase64Url,
  $toHex,
  $toLatin1,
  textEncoder,
} from "~/encode.js";
import { ascii, largeBinary, latin1Bytes, unicode } from "./__helpers__.js";

describe("Latin1", () => {
  test("roundtrips ASCII", () => {
    const bytes = $fromLatin1(ascii);
    expect($toLatin1(bytes)).toBe(ascii);
  });

  test("roundtrips full 0–255 range", () => {
    const str = $toLatin1(latin1Bytes);
    const back = $fromLatin1(str);
    expect(back).toEqual(latin1Bytes);
  });

  test("handles empty input", () => {
    expect($toLatin1(new Uint8Array())).toBe("");
    expect($fromLatin1("")).toEqual(new Uint8Array());
  });

  test("$fromLatin1 throws on char > 255", () => {
    expect(() => $fromLatin1("café☕")).toThrow("Invalid latin1 string");
  });

  test("$toLatin1 chunks correctly with >32KB data", () => {
    const str = $toLatin1(largeBinary);
    expect(str.length).toBe(40_000);
    const back = $fromLatin1(str);
    expect(back).toEqual(largeBinary);
  });
});

describe("Base64", () => {
  test("roundtrips bytes", () => {
    const bytes = textEncoder.encode(ascii);
    expect($fromBase64($toBase64(bytes))).toEqual(bytes);
  });

  test("known vector: Hello, World!", () => {
    const bytes = textEncoder.encode("Hello, World!");
    expect($toBase64(bytes)).toBe("SGVsbG8sIFdvcmxkIQ==");
  });

  test("handles empty input", () => {
    expect($toBase64(new Uint8Array())).toBe("");
    expect($fromBase64("")).toEqual(new Uint8Array());
  });

  test("roundtrips full byte range", () => {
    const encoded = $toBase64(latin1Bytes);
    expect($fromBase64(encoded)).toEqual(latin1Bytes);
  });
});

describe("Base64URL", () => {
  test("roundtrips bytes", () => {
    const bytes = textEncoder.encode(ascii);
    expect($fromBase64Url($toBase64Url(bytes))).toEqual(bytes);
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
    expect($fromBase64Url(urlSafe)).toEqual(bytes);
  });
});

describe("Hex", () => {
  test("roundtrips bytes", () => {
    const bytes = textEncoder.encode(ascii);
    expect($fromHex($toHex(bytes))).toEqual(bytes);
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
    expect(bytes).toEqual(new Uint8Array([0, 255, 16]));
  });

  test("throws on odd-length string", () => {
    expect(() => $fromHex("abc")).toThrow("Invalid hex string");
  });

  test("throws on invalid hex chars", () => {
    expect(() => $fromHex("zzzz")).toThrow("Invalid hex string");
  });

  test("handles empty input", () => {
    expect($toHex(new Uint8Array())).toBe("");
    expect($fromHex("")).toEqual(new Uint8Array());
  });
});

describe("$convertStrToBytes", () => {
  test("defaults to utf8", () => {
    const result = $convertStrToBytes(ascii);
    expect(result.success).toBe(true);
    if (result.success) expect(result.result).toEqual(textEncoder.encode(ascii));
  });

  test("converts each encoding", () => {
    const hex = $toHex(textEncoder.encode(ascii));
    const result = $convertStrToBytes(hex, "hex");
    expect(result.success).toBe(true);
    if (result.success) expect(result.result).toEqual(textEncoder.encode(ascii));
  });

  test("fails for empty string", () => {
    const result = $convertStrToBytes("");
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Empty data");
  });

  test("fails for invalid encoding", () => {
    const result = $convertStrToBytes("data", "nope" as any);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Unsupported encoding");
  });
});

describe("$convertBytesToStr", () => {
  test("defaults to utf8", () => {
    const bytes = textEncoder.encode(ascii);
    const result = $convertBytesToStr(bytes);
    expect(result.success).toBe(true);
    if (result.success) expect(result.result).toBe(ascii);
  });

  test("converts each encoding", () => {
    const bytes = textEncoder.encode(ascii);
    const result = $convertBytesToStr(bytes, "hex");
    expect(result.success).toBe(true);
    if (result.success) expect(result.result).toBe($toHex(bytes));
  });

  test("accepts ArrayBuffer", () => {
    const bytes = textEncoder.encode(ascii);
    const result = $convertBytesToStr(bytes.buffer as ArrayBuffer, "utf8");
    expect(result.success).toBe(true);
    if (result.success) expect(result.result).toBe(ascii);
  });

  test("fails for non-buffer input", () => {
    const result = $convertBytesToStr("not bytes" as any);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid data type");
  });

  test("fails for invalid encoding", () => {
    const result = $convertBytesToStr(new Uint8Array([1]), "nope" as any);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Unsupported encoding");
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
      expect(back.success).toBe(true);
      if (back.success) expect(back.result).toBe(original);
    });
  }

  test("roundtrips unicode via utf8", () => {
    const toBytes = $convertStrToBytes(unicode, "utf8");
    expect(toBytes.success).toBe(true);
    if (!toBytes.success) return;

    const back = $convertBytesToStr(toBytes.result, "utf8");
    expect(back.success).toBe(true);
    if (back.success) expect(back.result).toBe(unicode);
  });
});
