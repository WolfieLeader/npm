import type { Result } from "@internal/helpers";
import { $fmtResultErr } from "@internal/helpers";
import { describe, expect, test } from "vitest";
import * as cipherKit from "~/export.js";

type Fn = (...args: unknown[]) => unknown;

// Every fallible function rejects a symbol as its first argument.
const BAD = Symbol("bad");

/** Pairs each `tryX` export with its throwing twin `x`. */
function twins(surface: object): { name: string; tryFn: Fn; throwingFn: unknown }[] {
  return Object.entries(surface)
    .filter(([key]) => key.startsWith("try"))
    .map(([key, tryFn]) => {
      const name = `${key.charAt(3).toLowerCase()}${key.slice(4)}`;
      return { name, tryFn: tryFn as Fn, throwingFn: Reflect.get(surface, name) as unknown };
    });
}

const surfaces = [
  {
    label: "cipher-kit",
    surface: cipherKit,
    names: ["parseToObj", "stringifyObj"],
  },
  {
    label: "nodeKit",
    surface: cipherKit.nodeKit,
    names: [
      "convertBytesToStr",
      "convertEncoding",
      "convertStrToBytes",
      "createSecretKey",
      "decrypt",
      "decryptObj",
      "encrypt",
      "encryptObj",
      "generateUuid",
      "hash",
      "hashPassword",
      "verifyPassword",
    ],
  },
  {
    label: "webKit",
    surface: cipherKit.webKit,
    names: [
      "convertBytesToStr",
      "convertEncoding",
      "convertStrToBytes",
      "createSecretKey",
      "decrypt",
      "decryptObj",
      "encrypt",
      "encryptObj",
      "generateUuid",
      "hash",
      "hashPassword",
      "verifyPassword",
    ],
  },
];

for (const { label, surface, names } of surfaces) {
  describe(`${label}: each throwing function throws exactly the error its try* twin returns`, () => {
    const pairs = twins(surface);

    test("names every try* export, so a new one cannot skip this check", () => {
      expect(pairs.map(({ name }) => name).toSorted()).toStrictEqual(names);
    });

    // generateUuid takes no input, so a caller cannot make it fail.
    for (const { name, tryFn, throwingFn } of pairs.filter((pair) => pair.name !== "generateUuid")) {
      test(`${name} throws what try* returns`, async () => {
        expect(typeof throwingFn).toBe("function");
        const result = (await tryFn(BAD)) as Result<unknown>;
        expect(result.success).toBe(false);
        await expect(async () => {
          await (throwingFn as Fn)(BAD);
        }).rejects.toThrow(new Error($fmtResultErr(result.error)));
      });
    }
  });
}
