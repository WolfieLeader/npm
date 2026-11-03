import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import { $convertBytesToStr, $convertStrToBytes, ENCODING } from "~/encode.js";
import { $parseToObj, $stringifyObj } from "~/object.js";

// Any code point, without lone surrogates. Uniform code points almost never hit the characters that broke
// codecs before (a leading U+FEFF was dropped), so half the characters come from a list of edge cases.
const edgeChar = fc.constantFrom("\uFEFF", "\u0000", "\uFFFD", "\u{10FFFF}", "=", ".", "\r\n");
const anyText = fc.string({ unit: fc.oneof(fc.string({ unit: "binary", minLength: 1, maxLength: 1 }), edgeChar) });
const binaryEncoding = fc.constantFrom("base64", "base64url", "hex" as const);
// Keys the read side rejects show up often, so the write side's agreement with it is actually exercised.
const riskyKey = fc.oneof(fc.string(), fc.constantFrom("__proto__", "constructor", "prototype"));
const nestedObject = fc.dictionary(riskyKey, fc.jsonValue());
const jsonObject = fc.dictionary(riskyKey, fc.oneof(fc.jsonValue(), nestedObject));
const anyValue = fc.anything({
  withNullPrototype: true,
  withBigInt: true,
  withMap: true,
  withSet: true,
  withDate: true,
});

describe("Codec properties", () => {
  test("every encoding round-trips any bytes", () => {
    fc.assert(
      fc.property(fc.uint8Array(), binaryEncoding, (bytes, encoding) => {
        const text = $convertBytesToStr(bytes, encoding);
        expect(text.success).toBe(true);
        expect($convertStrToBytes(text.result as string, encoding)).toStrictEqual({ success: true, result: bytes });
      }),
    );
  });

  test("UTF-8 round-trips any well-formed string", () => {
    fc.assert(
      fc.property(anyText, (text) => {
        const bytes = $convertStrToBytes(text, "utf8");
        expect(bytes.success).toBe(true);
        expect($convertBytesToStr(bytes.result as Uint8Array, "utf8")).toStrictEqual({ success: true, result: text });
      }),
    );
  });

  test("decoding any string returns a Result and never throws", () => {
    fc.assert(
      fc.property(anyText, fc.constantFrom(...ENCODING), (text, encoding) => {
        expect(typeof $convertStrToBytes(text, encoding).success).toBe("boolean");
      }),
    );
  });
});

describe("Object properties", () => {
  test("stringify and parse return a Result for any value and never throw", () => {
    fc.assert(
      fc.property(anyValue, anyText, (value, text) => {
        expect(typeof $stringifyObj(value as object).success).toBe("boolean");
        expect(typeof $parseToObj(text).success).toBe("boolean");
      }),
    );
  });

  test("stringifyObj accepts exactly what parseToObj accepts, so nothing written becomes unreadable", () => {
    fc.assert(
      fc.property(jsonObject, (obj) => {
        expect($parseToObj(JSON.stringify(obj)).success).toBe($stringifyObj(obj).success);
      }),
    );
  });

  test("whatever stringifyObj accepts survives parse and stringify unchanged", () => {
    fc.assert(
      fc.property(jsonObject, (obj) => {
        const json = $stringifyObj(obj);
        fc.pre(json.success);
        const parsed = $parseToObj(json.result);
        expect($stringifyObj(parsed.result as object)).toStrictEqual(json);
      }),
    );
  });
});
