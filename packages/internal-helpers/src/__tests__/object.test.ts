import { describe, expect, test } from "vitest";
import { $parseToObj, $stringifyObj } from "~/object.js";

describe("$stringifyObj", () => {
  test("stringifies plain object", () => {
    const result = $stringifyObj({ a: 1, b: "two" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.result).toBe('{"a":1,"b":"two"}');
  });

  test("stringifies empty object", () => {
    const result = $stringifyObj({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.result).toBe("{}");
  });

  test("stringifies nested object", () => {
    const result = $stringifyObj({ a: { b: { c: 3 } } });
    expect(result.success).toBe(true);
    if (result.success) expect(result.result).toBe('{"a":{"b":{"c":3}}}');
  });

  test("fails for array", () => {
    const result = $stringifyObj([1, 2] as any);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid object");
  });

  test("fails for null", () => {
    const result = $stringifyObj(null as any);
    expect(result.success).toBe(false);
  });

  test("fails for class instance", () => {
    class Foo {
      x = 1;
    }
    const result = $stringifyObj(new Foo());
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid object");
  });

  test("fails for circular reference", () => {
    const obj: any = { a: 1 };
    obj.self = obj;
    const result = $stringifyObj(obj);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Stringify error");
  });
});

describe("$parseToObj", () => {
  test("parses valid JSON object", () => {
    const result = $parseToObj('{"a":1}');
    expect(result.success).toBe(true);
    if (result.success) expect(result.result).toEqual({ a: 1 });
  });

  test("parses empty object", () => {
    const result = $parseToObj("{}");
    expect(result.success).toBe(true);
    if (result.success) expect(result.result).toEqual({});
  });

  test("fails for empty string", () => {
    const result = $parseToObj("");
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid input");
  });

  test("fails for whitespace-only string", () => {
    const result = $parseToObj("   ");
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid input");
  });

  test("fails for non-string input", () => {
    const result = $parseToObj(42 as any);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid input");
  });

  test("fails for JSON array", () => {
    const result = $parseToObj("[1,2,3]");
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid object format");
  });

  test("fails for JSON primitive", () => {
    const result = $parseToObj('"hello"');
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid object format");
  });

  test("fails for malformed JSON", () => {
    const result = $parseToObj("{invalid}");
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Invalid format");
  });
});

describe("Roundtrip", () => {
  test("stringify then parse returns equal object", () => {
    const original = { name: "test", count: 42, nested: { arr: [1, 2, 3] } };
    const stringified = $stringifyObj(original);
    expect(stringified.success).toBe(true);
    if (!stringified.success) return;

    const parsed = $parseToObj(stringified.result);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.result).toEqual(original);
  });
});
