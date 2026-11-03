import { parseCookie } from "cookie";
import * as fc from "fast-check";
import { describe, expect, test, vi } from "vitest";
import { getCookie, setCookie } from "~/index.js";
import type { CookieLogger, CookieOptions, CookieRequest, CookieResponse } from "~/index.js";

const syntaxChar = fc.constantFrom("%", "%25", "%41", ";", ",", "=", '"', " ", "\r\n", "\uFEFF");
const anyText = fc.string({ unit: fc.oneof(fc.string({ unit: "binary", minLength: 1, maxLength: 1 }), syntaxChar) });
const anyValue = fc.anything({ withNullPrototype: true, withBigInt: true, withDate: true });

const KNOWN_NAMES = ["s", "session", "sessions", "__Host-s", "__host-s", "__Host-session", "__Secure-sid", "sid"];
const NAME_CHARS = Array.from({ length: 0x7f - 0x21 }, (_, i) => String.fromCodePoint(0x21 + i)).filter(
  (char) => char !== ";" && char !== "=",
);
/** Characters the parser returns as written: no `%` to decode, no `;` to split on, no whitespace to trim. */
const LITERAL_VALUE_CHARS = [...NAME_CHARS.filter((char) => char !== "%"), "="];
/** Whitespace that `String#trim` strips but the parser keeps as part of a name. */
const NAME_KEPT_WHITESPACE = ["\r\n", "\u000B", "\u00A0", "\uFEFF"];
const cookieName = fc.oneof(
  fc.constantFrom(...KNOWN_NAMES),
  fc.string({ unit: fc.constantFrom(...NAME_CHARS), minLength: 1, maxLength: 12 }),
);
const cookieValue = fc.oneof(
  fc.constantFrom("", '""', '"quoted"', "a=b", "==", "real", "attacker"),
  fc.string({ unit: fc.constantFrom(...LITERAL_VALUE_CHARS), maxLength: 12 }),
);
const nameEquals = fc.constantFrom("=", " =", "= ", " = ", "\t=\t");
const pairSeparator = fc.constantFrom(";", "; ", " ;", " ; ", ";\t", "\t;  ", ";;");
/** The logged line for a doubled name, with control characters in the name shown as spaces, as the logger gets it. */
function doubledMessage(name: string): string {
  const shown = Array.from(name, (char) => (char < " " || char === "\u007F" ? " " : char)).join("");
  return `Error getting cookie "${shown}": the Cookie header has this name more than once`;
}

/** Names that differ from `target` yet share most of its characters: prefixes, extensions, other casings. */
function otherName(target: string): fc.Arbitrary<string> {
  return fc
    .oneof(
      cookieName,
      fc.constantFrom(target.slice(0, -1), `${target}x`, `x${target}`, target.toLowerCase(), target.toUpperCase()),
    )
    .filter((name) => name !== target);
}

function cookiePair(name: fc.Arbitrary<string>): fc.Arbitrary<string> {
  return fc
    .tuple(name, nameEquals, cookieValue, pairSeparator)
    .map(([key, equals, value, separator]) => `${key}${equals}${value}${separator}`);
}

function otherPairs(target: string): fc.Arbitrary<string[]> {
  return fc.array(cookiePair(otherName(target)), { maxLength: 4 });
}

/** A header with `name` twice, once planted and once real, at any positions among other names. */
function tossedHeader(name: string): fc.Arbitrary<string> {
  const pairOfName = cookiePair(fc.constant(name));
  return fc
    .tuple(fc.constantFrom("", " ", "\t"), otherPairs(name), pairOfName, otherPairs(name), pairOfName, otherPairs(name))
    .map(([lead, before, planted, between, real, after]) =>
      [lead, ...before, planted, ...between, real, ...after].join(""),
    );
}

/** A header with `name` once and another name twice; the value is the one `name` holds. */
function onceHeader(name: string): fc.Arbitrary<{ header: string; value: string }> {
  return fc
    .tuple(cookieValue, nameEquals, otherName(name), otherPairs(name), otherPairs(name))
    .map(([value, equals, doubled, before, after]) => {
      const parts = [`${doubled}=1; `, `${doubled}=2; `, ...before, `${name}${equals}${value}; `, ...after];
      return { header: parts.join(""), value };
    });
}

/** Header text built mostly from a few names, so names repeat, mixed with separators and kept whitespace. */
function hostileHeader(pool: string[]): fc.Arbitrary<string> {
  const spacedName = fc
    .tuple(fc.constantFrom(...NAME_KEPT_WHITESPACE), fc.constantFrom(...pool))
    .map(([space, name]) => `;${space}${name}=`);
  const fragment = fc.oneof(
    { weight: 3, arbitrary: fc.constantFrom(...pool.flatMap((name) => [name, `${name}=`, `; ${name}=`])) },
    { weight: 1, arbitrary: spacedName },
    { weight: 2, arbitrary: fc.constantFrom(...NAME_KEPT_WHITESPACE, "=", ";", " ", "\t", '"', "%", "%3D") },
    { weight: 1, arbitrary: fc.string({ unit: "binary", minLength: 1, maxLength: 1 }) },
  );
  return fc.array(fragment, { maxLength: 16 }).map((parts) => parts.join(""));
}

/**
 * Lists each pair's name in header order, as `parseCookie` itself splits and trims them.
 * A `decode` that returns `undefined` leaves a name unset, so the parser decodes every pair and only pair `k` sticks.
 */
function namesByParser(header: string): string[] {
  const names: string[] = [];
  for (let k = 0; ; k++) {
    let calls = 0;
    const parsed = parseCookie(header, { decode: () => (calls++ === k ? "\u0000marker" : undefined) });
    if (calls <= k) return names;
    names.push(Object.keys(parsed).find((key) => parsed[key] === "\u0000marker") ?? "");
  }
}

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

  test("a client-planted twin of a cookie name reads as absent, so cookie tossing cannot pick the value", () => {
    const tossed = cookieName.chain((name) => fc.tuple(fc.constant(name), tossedHeader(name)));
    fc.assert(
      fc.property(tossed, ([name, header]) => {
        const logger = vi.fn<CookieLogger>();
        expect(getCookie(requestWith(header), name, { logger })).toBe(undefined);
        expect(logger.mock.calls).toStrictEqual([[doubledMessage(name)]]);
      }),
    );
  });

  test("a name sent once reads its value, even when other names, including its prefixes, appear twice", () => {
    const once = cookieName.chain((name) => fc.tuple(fc.constant(name), onceHeader(name)));
    fc.assert(
      fc.property(once, ([name, { header, value }]) => {
        const logger = vi.fn<CookieLogger>();
        expect(getCookie(requestWith(header), name, { logger })).toBe(value);
        expect(logger.mock.calls).toStrictEqual([]);
      }),
    );
  });

  test("any header reads a name as the parser does when it names one pair, and as absent when it names more", () => {
    const header = fc.subarray(KNOWN_NAMES, { minLength: 1, maxLength: 3 }).chain(hostileHeader);
    fc.assert(
      fc.property(header, fc.constantFrom(...KNOWN_NAMES), (text, extraName) => {
        const names = namesByParser(text);
        const parsed = parseCookie(text);
        for (const name of [...names, extraName]) {
          const count = names.filter((other) => other === name).length;
          const expected = count === 1 ? parsed[name] : undefined;
          const logger = vi.fn<CookieLogger>();
          expect(getCookie(requestWith(text), name, { logger })).toBe(expected);
          expect(logger.mock.calls).toStrictEqual(count > 1 ? [[doubledMessage(name)]] : []);
        }
      }),
    );
  });
});
