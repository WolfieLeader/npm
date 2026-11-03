import type { Result } from "@internal/helpers";
import { $fmtResultErr } from "@internal/helpers";
import { expect, test } from "vitest";
import * as compressKit from "~/index.js";

type Fn = (...args: unknown[]) => unknown;

// Every fallible function rejects a symbol as its first argument.
const BAD = Symbol("bad");

const pairs = Object.entries(compressKit)
  .filter(([key]) => key.startsWith("try"))
  .map(([key, tryFn]) => {
    const name = `${key.charAt(3).toLowerCase()}${key.slice(4)}`;
    return { name, tryFn: tryFn as Fn, throwingFn: Reflect.get(compressKit, name) as unknown };
  });

test("names every try* export, so a new one cannot skip the twin check", () => {
  expect(pairs.map(({ name }) => name).toSorted()).toStrictEqual([
    "compress",
    "compressObj",
    "decompress",
    "decompressObj",
  ]);
});

for (const { name, tryFn, throwingFn } of pairs) {
  test(`${name} throws exactly the error its try* twin returns`, () => {
    expect(typeof throwingFn).toBe("function");
    const result = tryFn(BAD) as Result<unknown>;
    expect(result.success).toBe(false);
    expect(() => (throwingFn as Fn)(BAD)).toThrow(new Error($fmtResultErr(result.error)));
  });
}
