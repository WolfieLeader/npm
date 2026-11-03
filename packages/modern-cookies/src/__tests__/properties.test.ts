import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import { getCookie, setCookie } from "~/index.js";
import type { CookieOptions, CookieRequest, CookieResponse } from "~/index.js";

const syntaxChar = fc.constantFrom("%", "%25", "%41", ";", ",", "=", '"', " ", "\r\n", "\uFEFF");
const anyText = fc.string({ unit: fc.oneof(fc.string({ unit: "binary", minLength: 1, maxLength: 1 }), syntaxChar) });
const anyValue = fc.anything({ withNullPrototype: true, withBigInt: true, withDate: true });

function capture(): CookieResponse & { headers: string[] } {
  const headers: string[] = [];
  return { headers, append: (_name, value) => headers.push(...[value].flat()) };
}

function requestWith(cookieHeader: string): CookieRequest {
  return { get: (name) => (name.toLowerCase() === "cookie" ? cookieHeader : undefined) };
}

describe("modern-cookies properties", () => {
  test("any value set with setCookie reads back unchanged with getCookie", () => {
    fc.assert(
      fc.property(anyText, (value) => {
        const res = capture();
        expect(setCookie(res, "token", value, {})).toBe(true);
        const [pair = ""] = (res.headers[0] ?? "").split(";");
        expect(getCookie(requestWith(pair), "token")).toBe(value);
      }),
    );
  });

  test("hostile names, values or options return a boolean, never a throw", () => {
    fc.assert(
      fc.property(anyValue, anyValue, anyValue, (name, value, options) => {
        const result = setCookie(capture(), name as string, value as string, options as CookieOptions);
        expect(typeof result).toBe("boolean");
      }),
    );
  });
});
