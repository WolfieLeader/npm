import { describe, expect, test } from "vitest";
import {
  $convertBytesToStr,
  $convertStrToBytes,
  $fromBase64,
  $fromBase64Url,
  $toBase64,
  $toBase64Url,
  bytesToStr,
  strToBytes,
} from "~/encode.js";
import { $parseToObj, $stringifyObj, MAX_OBJ_CONTAINERS } from "~/object.js";
import { $isWellFormedStr } from "~/validate.js";

// V8's backtracking regex overflowed its stack above ~4.47M base64 chars.
const LARGE_BYTES = Uint8Array.from({ length: 5 * 1024 * 1024 }, (_, i) => (i * 31) % 256);
// `toStrictEqual` walks 5M elements one at a time (about 5s), so compare the bytes natively.
const sameBytes = (a: Uint8Array, b: Uint8Array): boolean => Buffer.compare(a, b) === 0;

describe("base64 decoding of large input", () => {
  test("$fromBase64 decodes more than 4.5M chars", () => {
    const encoded = $toBase64(LARGE_BYTES);
    expect(encoded.length).toBeGreaterThan(4_500_000);
    expect(sameBytes($fromBase64(encoded), LARGE_BYTES)).toBe(true);
  });

  test("$fromBase64Url decodes more than 4.5M chars", () => {
    const encoded = $toBase64Url(LARGE_BYTES);
    expect(encoded.length).toBeGreaterThan(4_500_000);
    expect(sameBytes($fromBase64Url(encoded), LARGE_BYTES)).toBe(true);
  });

  test("$convertStrToBytes returns an error, not a throw, for huge invalid base64", () => {
    const huge = `${"A".repeat(8_000_000)}!`;
    expect($convertStrToBytes(huge, "base64").success).toBe(false);
    expect($convertStrToBytes(huge, "base64url").success).toBe(false);
  });
});

describe("canonical base64", () => {
  test("rejects non-zero trailing bits", () => {
    expect($fromBase64("AA==")).toStrictEqual(new Uint8Array([0]));
    expect(() => $fromBase64("AB==")).toThrow("Invalid base64 string");
    expect(() => $fromBase64("AAB=")).toThrow("Invalid base64 string");
    expect(() => $fromBase64Url("AB")).toThrow("Invalid base64url string");
    expect(() => $fromBase64Url("AAB")).toThrow("Invalid base64url string");
  });

  test("rejects bad length and misplaced padding", () => {
    for (const bad of ["A", "AA", "AAA", "A===", "=AAA", "AA=A", "AAAA=", "AAAAA", "AA==AA==", " AAA", "AAAA\n"]) {
      expect(() => $fromBase64(bad), bad).toThrow("Invalid base64 string");
    }
  });

  test("base64url accepts no padding or exact padding only", () => {
    expect($fromBase64Url("YWI")).toStrictEqual(new Uint8Array([0x61, 0x62]));
    expect($fromBase64Url("YWI=")).toStrictEqual(new Uint8Array([0x61, 0x62]));
    expect($fromBase64Url("YQ")).toStrictEqual(new Uint8Array([0x61]));
    expect($fromBase64Url("YQ==")).toStrictEqual(new Uint8Array([0x61]));
    for (const bad of ["YWI==", "YQ=", "YWJj=", "Y", "YQ===", "Y+I", "Y/I", "YW I"]) {
      expect(() => $fromBase64Url(bad), bad).toThrow("Invalid base64url string");
    }
  });

  test("full byte range roundtrips through both alphabets", () => {
    const all = Uint8Array.from({ length: 256 }, (_, i) => i);
    for (let len = 0; len <= 5; len++) {
      const slice = all.subarray(250 - len, 250);
      expect($fromBase64($toBase64(slice))).toStrictEqual(slice);
      expect($fromBase64Url($toBase64Url(slice))).toStrictEqual(slice);
    }
  });
});

describe("strict UTF-8", () => {
  test("keeps a leading BOM when decoding", () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, 0x61]);
    expect(bytesToStr.utf8(bytes)).toBe("\uFEFFa");
  });

  test("rejects lone surrogates when encoding", () => {
    expect(() => strToBytes.utf8("a\uD800b")).toThrow("Invalid UTF-16 string (lone surrogate)");
    const result = $convertStrToBytes("a\uDC00b", "utf8");
    expect(result.success).toBe(false);
  });

  test("rejects invalid UTF-8 bytes when decoding", () => {
    expect($convertBytesToStr(new Uint8Array([0xff]), "utf8").success).toBe(false);
  });
});

describe("$isWellFormedStr", () => {
  test("accepts any well-formed string, including empty and whitespace", () => {
    expect($isWellFormedStr("")).toBe(true);
    expect($isWellFormedStr("   ")).toBe(true);
    expect($isWellFormedStr("🦊 ok")).toBe(true);
  });

  test("rejects lone surrogates and non-strings", () => {
    expect($isWellFormedStr("a\uD800")).toBe(false);
    expect($isWellFormedStr("\uDC00a")).toBe(false);
    expect($isWellFormedStr("\uDBFF\uD800")).toBe(false);
    expect($isWellFormedStr(42)).toBe(false);
    expect($isWellFormedStr(Symbol("x"))).toBe(false);
  });

  test("enforces a minimum length", () => {
    expect($isWellFormedStr("", 1)).toBe(false);
    expect($isWellFormedStr(" ", 1)).toBe(true);
  });
});

describe("error messages never echo input", () => {
  test("$parseToObj does not leak non-JSON plaintext", () => {
    const plaintext = "SSN=123-45-6789 card=4111111111111111";
    const result = $parseToObj(plaintext);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error)).not.toContain("SSN");
    expect(JSON.stringify(result.error)).not.toContain("123-45");
  });

  test("$parseToObj does not leak malformed JSON", () => {
    const result = $parseToObj('{"password":"hunter2-super-secret", oops}');
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error)).not.toContain("hunter2");
    expect(JSON.stringify(result.error)).not.toContain("oops");
  });

  test("$stringifyObj does not leak property names", () => {
    const obj: Record<string, unknown> = { secretField: 1 };
    obj["loopBackToSecret"] = obj;
    const result = $stringifyObj(obj);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error)).not.toContain("secretField");
    expect(JSON.stringify(result.error)).not.toContain("loopBackToSecret");
  });

  test("unsupported encoding errors do not echo or throw on symbols", () => {
    const sym = Symbol("x") as unknown as "utf8";
    const encodings = "Use base64, base64url, hex, utf8, or latin1";
    expect($convertStrToBytes("abc", sym)).toStrictEqual({
      success: false,
      error: { message: "strToBytes: Unsupported encoding", description: encodings },
    });
    expect($convertBytesToStr(new Uint8Array([1]), sym)).toStrictEqual({
      success: false,
      error: { message: "bytesToStr: Unsupported encoding", description: encodings },
    });
    const leaked = $convertStrToBytes("abc", "my-secret-value" as "utf8");
    expect(JSON.stringify(leaked.error)).not.toContain("my-secret-value");
  });
});

/** A plain object with exactly `n` containers: the root, the `items` array, and `n - 2` item objects. */
function withContainers(n: number): { items: { i: number }[] } {
  return { items: Array.from({ length: n - 2 }, (_, i) => ({ i })) };
}

describe("object container limit is symmetric", () => {
  test("at the limit both sides succeed", () => {
    const str = $stringifyObj(withContainers(MAX_OBJ_CONTAINERS));
    expect(str.success).toBe(true);
    if (!str.success) return;
    expect($parseToObj(str.result).success).toBe(true);
  });

  test("over the limit both sides fail with the same accurate message", () => {
    const obj = withContainers(MAX_OBJ_CONTAINERS + 1);
    const str = $stringifyObj(obj);
    expect(str.success).toBe(false);
    expect(str.error?.message).toContain("too many nested objects or arrays");

    const parsed = $parseToObj(JSON.stringify(obj));
    expect(parsed.success).toBe(false);
    expect(parsed.error?.message).toContain("too many nested objects or arrays");
  });

  test("strings containing braces do not count as containers", () => {
    const str = $stringifyObj({ s: "{[".repeat(MAX_OBJ_CONTAINERS) });
    expect(str.success).toBe(true);
    if (!str.success) return;
    expect($parseToObj(str.result).success).toBe(true);
  });
});
