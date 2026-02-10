import { describe, expect, test } from "vitest";
import { $isIntIn, $isPlainObj, $isStr } from "~/validate.js";

describe("$isStr", () => {
  test("accepts normal string", () => {
    expect($isStr("hello")).toBe(true);
  });

  test("accepts single character", () => {
    expect($isStr("a")).toBe(true);
  });

  test("rejects empty string", () => {
    expect($isStr("")).toBe(false);
  });

  test("rejects whitespace-only string", () => {
    expect($isStr("   ")).toBe(false);
  });

  test("rejects null", () => {
    expect($isStr(null)).toBe(false);
  });

  test("rejects undefined", () => {
    expect($isStr(undefined)).toBe(false);
  });

  test("rejects number", () => {
    expect($isStr(42)).toBe(false);
  });

  test("rejects object", () => {
    expect($isStr({})).toBe(false);
  });

  test("respects custom min length", () => {
    expect($isStr("ab", 3)).toBe(false);
    expect($isStr("abc", 3)).toBe(true);
  });

  test("trims before checking min", () => {
    expect($isStr("  a  ", 2)).toBe(false);
    expect($isStr("  ab  ", 2)).toBe(true);
  });

  test("accepts any string with min=0", () => {
    expect($isStr("", 0)).toBe(true);
    expect($isStr("   ", 0)).toBe(true);
  });
});

describe("$isIntIn", () => {
  test("accepts in-range integer", () => {
    expect($isIntIn(5, 1, 10)).toBe(true);
  });

  test("accepts lower bound (inclusive)", () => {
    expect($isIntIn(1, 1, 10)).toBe(true);
  });

  test("accepts upper bound (inclusive)", () => {
    expect($isIntIn(10, 1, 10)).toBe(true);
  });

  test("rejects below range", () => {
    expect($isIntIn(0, 1, 10)).toBe(false);
  });

  test("rejects above range", () => {
    expect($isIntIn(11, 1, 10)).toBe(false);
  });

  test("rejects float", () => {
    expect($isIntIn(5.5, 1, 10)).toBe(false);
  });

  test("rejects NaN", () => {
    expect($isIntIn(Number.NaN, 1, 10)).toBe(false);
  });

  test("rejects Infinity", () => {
    expect($isIntIn(Number.POSITIVE_INFINITY, 1, 10)).toBe(false);
  });

  test("rejects string", () => {
    expect($isIntIn("5" as any, 1, 10)).toBe(false);
  });

  test("rejects null", () => {
    expect($isIntIn(null as any, 1, 10)).toBe(false);
  });

  test("works with negative range", () => {
    expect($isIntIn(-5, -10, -1)).toBe(true);
    expect($isIntIn(0, -10, -1)).toBe(false);
  });

  test("works with single-value range", () => {
    expect($isIntIn(5, 5, 5)).toBe(true);
    expect($isIntIn(4, 5, 5)).toBe(false);
  });
});

describe("$isPlainObj", () => {
  test("accepts object literal", () => {
    expect($isPlainObj({ a: 1 })).toBe(true);
  });

  test("accepts empty object", () => {
    expect($isPlainObj({})).toBe(true);
  });

  test("accepts Object.create(null)", () => {
    expect($isPlainObj(Object.create(null))).toBe(true);
  });

  test("rejects null", () => {
    expect($isPlainObj(null)).toBe(false);
  });

  test("rejects undefined", () => {
    expect($isPlainObj(undefined)).toBe(false);
  });

  test("rejects array", () => {
    expect($isPlainObj([1, 2])).toBe(false);
  });

  test("rejects Date", () => {
    expect($isPlainObj(new Date())).toBe(false);
  });

  test("rejects Map", () => {
    expect($isPlainObj(new Map())).toBe(false);
  });

  test("rejects class instance", () => {
    class Foo {}
    expect($isPlainObj(new Foo())).toBe(false);
  });

  test("rejects primitives", () => {
    expect($isPlainObj(42)).toBe(false);
    expect($isPlainObj("str")).toBe(false);
    expect($isPlainObj(true)).toBe(false);
  });
});
