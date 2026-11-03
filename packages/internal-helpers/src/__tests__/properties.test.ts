import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import { $convertBytesToStr, $convertStrToBytes, ENCODING } from "~/encode.js";
import { $parseToObj, $stringifyObj } from "~/object.js";
import { $isWellFormedStr } from "~/validate.js";

// Any code point, without lone surrogates. Uniform code points almost never hit the characters that broke
// codecs before (a leading U+FEFF was dropped), so half the characters come from a list of edge cases.
const edgeChar = fc.constantFrom("\uFEFF", "\u0000", "\uFFFD", "\u{10FFFF}", "=", ".", "\r\n");
const anyText = fc.string({ unit: fc.oneof(fc.string({ unit: "binary", minLength: 1, maxLength: 1 }), edgeChar) });
// Any UTF-16 code units, so lone surrogates are common; the edge cases sit at the surrogate ranges' boundaries.
const surrogateEdge = fc.constantFrom("\uD800", "\uDBFF", "\uDC00", "\uDFFF", "\uD83E\uDD8A", "\uFFFF");
const anyCodeUnits = fc.string({
  unit: fc.oneof(
    fc.integer({ min: 0, max: 0xff_ff }).map((code) => String.fromCodePoint(code)),
    surrogateEdge,
  ),
});
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

/** Runs `fn` as on a runtime without `String.prototype.isWellFormed`, such as Safari before 16.4. */
function withoutNative<T>(fn: () => T): T {
  const native = Object.getOwnPropertyDescriptor(String.prototype, "isWellFormed");
  if (native === undefined) throw new Error("This runtime has no String.prototype.isWellFormed to compare with");
  Reflect.deleteProperty(String.prototype, "isWellFormed");
  try {
    expect("isWellFormed" in String.prototype).toBe(false);
    return fn();
  } finally {
    // oxlint-disable-next-line no-extend-native -- puts back the runtime's own descriptor that this helper removed
    Object.defineProperty(String.prototype, "isWellFormed", native);
  }
}

describe("$isWellFormedStr fallback", () => {
  test("agrees with String.prototype.isWellFormed on any UTF-16 code units", () => {
    fc.assert(
      fc.property(anyCodeUnits, (text) => {
        expect(withoutNative(() => $isWellFormedStr(text))).toBe($isWellFormedStr(text));
      }),
    );
  });
});
