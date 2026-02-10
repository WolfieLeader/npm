import { describe, expect, test } from "vitest";
import type { Result } from "~/error.js";
import { $err, $fmtError, $fmtResultErr, $ok } from "~/error.js";

describe("$ok", () => {
  test("spreads plain object onto result", () => {
    const result = $ok({ result: new Uint8Array([1, 2]) });
    expect(result.success).toBe(true);
    expect(result.result).toEqual(new Uint8Array([1, 2]));
  });

  test("wraps string primitive", () => {
    const result = $ok("hello");
    expect(result.success).toBe(true);
    if (result.success) expect(result.result).toBe("hello");
  });

  test("wraps number primitive", () => {
    const result = $ok(42);
    expect(result.success).toBe(true);
    if (result.success) expect(result.result).toBe(42);
  });

  test("wraps boolean primitive", () => {
    const result = $ok(true);
    expect(result.success).toBe(true);
    if (result.success) expect(result.result).toBe(true);
  });

  test("wraps null", () => {
    const result = $ok(null);
    expect(result.success).toBe(true);
    if (result.success) expect(result.result).toBeNull();
  });

  test("wraps array (not spread)", () => {
    const result = $ok([1, 2, 3]) as Result<number[]> & { result: number[] };
    expect(result.success).toBe(true);
    expect(result.result).toEqual([1, 2, 3]);
  });

  test("error is undefined on success", () => {
    const result = $ok("data");
    expect(result.error).toBeUndefined();
  });

  test("preserves nested objects", () => {
    const result = $ok({ nested: { deep: { value: 42 } } });
    expect(result.success).toBe(true);
    if (result.success) expect(result.nested).toEqual({ deep: { value: 42 } });
  });

  test("wraps object with 'success' key instead of spreading", () => {
    const result = $ok({ success: false, data: 1 }) as unknown as {
      success: true;
      result: { success: false; data: 1 };
    };
    expect(result.success).toBe(true);
    expect(result.result).toEqual({ success: false, data: 1 });
  });

  test("wraps object with 'error' key instead of spreading", () => {
    const result = $ok({ error: "bad", value: 2 }) as unknown as {
      success: true;
      result: { error: string; value: number };
    };
    expect(result.success).toBe(true);
    expect(result.result).toEqual({ error: "bad", value: 2 });
  });
});

describe("$err", () => {
  test("accepts short form (msg/desc)", () => {
    const result = $err({ msg: "Failed", desc: "Something went wrong" }) as unknown as Result<string>;
    expect(result.success).toBe(false);
    expect(result.error).toEqual({ message: "Failed", description: "Something went wrong" });
  });

  test("accepts full form (message/description)", () => {
    const result = $err({ message: "Failed", description: "Something went wrong" }) as unknown as Result<string>;
    expect(result.success).toBe(false);
    expect(result.error).toEqual({ message: "Failed", description: "Something went wrong" });
  });

  test("success is false", () => {
    const result = $err({ msg: "err", desc: "desc" }) as unknown as Result<string>;
    expect(result.success).toBe(false);
  });

  test("result is undefined", () => {
    const result = $err({ msg: "err", desc: "desc" }) as unknown as Result<string>;
    expect(result.result).toBeUndefined();
  });
});

describe("$fmtError", () => {
  test("passes through string", () => {
    expect($fmtError("some error")).toBe("some error");
  });

  test("extracts Error.message", () => {
    expect($fmtError(new Error("boom"))).toBe("boom");
  });

  test("extracts TypeError.message", () => {
    expect($fmtError(new TypeError("type fail"))).toBe("type fail");
  });

  test("stringifies number", () => {
    expect($fmtError(42)).toBe("42");
  });

  test("stringifies null", () => {
    expect($fmtError(null)).toBe("null");
  });

  test("stringifies undefined", () => {
    expect($fmtError(undefined)).toBe("undefined");
  });

  test("stringifies object", () => {
    expect($fmtError({ key: "val" })).toBe("[object Object]");
  });
});

describe("$fmtResultErr", () => {
  test("formats message and description", () => {
    expect($fmtResultErr({ message: "Fail", description: "Details" })).toBe("Fail - Details");
  });

  test("returns Unknown error for undefined", () => {
    expect($fmtResultErr(undefined)).toBe("Unknown error");
  });
});
