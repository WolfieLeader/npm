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
    const result = $stringifyObj([1, 2] as unknown as object);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Input must be a plain object");
  });

  test("fails for null", () => {
    const result = $stringifyObj(null as unknown as object);
    expect(result.success).toBe(false);
  });

  test("fails for class instance", () => {
    class Foo {
      x = 1;
    }
    const result = $stringifyObj(new Foo());
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Input must be a plain object");
  });

  test("fails for circular reference", () => {
    const obj: { a: number; self?: object } = { a: 1 };
    obj.self = obj;
    const result = $stringifyObj(obj);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Failed to stringify object");
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
    expect(result.error?.message).toContain("Input must be a non-empty string");
  });

  test("fails for whitespace-only string", () => {
    const result = $parseToObj("   ");
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Input must be a non-empty string");
  });

  test("fails for non-string input", () => {
    const result = $parseToObj(42 as unknown as string);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Input must be a non-empty string");
  });

  test("fails for JSON array", () => {
    const result = $parseToObj("[1,2,3]");
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Parsed data is not a plain object");
  });

  test("fails for JSON primitive", () => {
    const result = $parseToObj('"hello"');
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Parsed data is not a plain object");
  });

  test("fails for malformed JSON", () => {
    const result = $parseToObj("{invalid}");
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Failed to parse JSON");
  });

  test("rejects object with __proto__ key", () => {
    const result = $parseToObj('{"__proto__":{"isAdmin":true}}');
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("prototype pollution");
  });

  test("rejects nested __proto__ key", () => {
    const result = $parseToObj('{"a":{"__proto__":{"polluted":true}}}');
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("prototype pollution");
  });

  test("rejects object with constructor.prototype key", () => {
    const result = $parseToObj('{"constructor":{"prototype":{"polluted":true}}}');
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("prototype pollution");
  });

  test("allows object with constructor key without prototype", () => {
    const result = $parseToObj('{"constructor":"safe"}');
    expect(result.success).toBe(true);
  });

  test("allows object with string value containing __proto__", () => {
    const result = $parseToObj('{"key":"__proto__"}');
    expect(result.success).toBe(true);
  });

  test("allows constructor.prototype when prototype value is a string", () => {
    const result = $parseToObj('{"constructor":{"prototype":"safe"}}');
    expect(result.success).toBe(true);
    if (result.success) expect(result.result).toEqual({ constructor: { prototype: "safe" } });
  });

  test("allows constructor.prototype when prototype value is a number", () => {
    const result = $parseToObj('{"constructor":{"prototype":42}}');
    expect(result.success).toBe(true);
    if (result.success) expect(result.result).toEqual({ constructor: { prototype: 42 } });
  });

  test("allows constructor.prototype when prototype value is null", () => {
    const result = $parseToObj('{"constructor":{"prototype":null}}');
    expect(result.success).toBe(true);
    if (result.success) expect(result.result).toEqual({ constructor: { prototype: null } });
  });

  test("fails safely when object graph is too deep to scan", () => {
    let payload = "{}";
    for (let i = 0; i < 100_005; i++) {
      payload = `{"x":${payload}}`;
    }

    const result = $parseToObj(payload);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("too deeply nested");
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
