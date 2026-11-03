import { describe, expect, test } from "vitest";
import { getClientIp } from "~/index.js";
import type { IpRequest } from "~/index.js";

const PROXY = "10.0.0.5";

function behindProxy(headers: IpRequest["headers"]): IpRequest {
  return { headers, socket: { remoteAddress: PROXY } };
}

describe("RFC 7239 Forwarded (opt-in)", () => {
  const fwd = { forwardedHeader: "forwarded" } as const;

  test("parses a plain node", () => {
    expect(getClientIp(behindProxy({ forwarded: "for=192.0.2.43" }), fwd)).toBe("192.0.2.43");
  });

  test("parses quoted values and other parameters", () => {
    expect(getClientIp(behindProxy({ forwarded: 'for="192.0.2.43";proto=https;by=10.0.0.5' }), fwd)).toBe("192.0.2.43");
  });

  test("parses quoted IPv6 with brackets and port", () => {
    expect(getClientIp(behindProxy({ forwarded: 'for="[2001:db8:cafe::17]:4711"' }), fwd)).toBe("2001:db8:cafe::17");
  });

  test("strips encoded zone IDs", () => {
    expect(getClientIp(behindProxy({ forwarded: 'for="[fe80::1%25eth0]"' }), fwd)).toBe("fe80::1");
  });

  test("walks from the right past a client-supplied element", () => {
    const req = behindProxy({ forwarded: "for=6.6.6.6, for=203.0.113.9" });
    expect(getClientIp(req, fwd)).toBe("203.0.113.9");
  });

  test("does not split on a comma inside a quoted string", () => {
    const req = behindProxy({ forwarded: 'for=203.0.113.9;host="a,b", for=10.0.0.9' });
    expect(getClientIp(req, fwd)).toBe("203.0.113.9");
  });

  test("does not split on a semicolon inside a quoted string", () => {
    const req = behindProxy({ forwarded: 'for=203.0.113.9;ext="a;for=6.6.6.6"' });
    expect(getClientIp(req, fwd)).toBe("203.0.113.9");
  });

  test("handles escaped quotes inside quoted strings", () => {
    const req = behindProxy({ forwarded: 'for=203.0.113.9;ext="x\\",for=6.6.6.6"' });
    expect(getClientIp(req, fwd)).toBe("203.0.113.9");
  });

  test.each([
    ["an unterminated quote", 'for="x, for=203.0.113.9', "203.0.113.9"],
    ["an unterminated quote before a quoted IPv6", 'for="x, for="[2001:db8::9]"', "2001:db8::9"],
    ["a stray backslash and quote", 'for=\\", for=203.0.113.9', "203.0.113.9"],
  ])("a client prefix with %s cannot hide the hop the proxy appended", (_label, forwarded, expected) => {
    expect(getClientIp(behindProxy({ forwarded }), fwd)).toBe(expected);
  });

  test("for=unknown stops the walk instead of promoting the next hop", () => {
    const req = behindProxy({ forwarded: "for=6.6.6.6, for=unknown" });
    expect(getClientIp(req, fwd)).toBe(PROXY);
  });

  test("obfuscated identifier stops the walk", () => {
    expect(getClientIp(behindProxy({ forwarded: 'for=6.6.6.6, for="_hidden"' }), fwd)).toBe(PROXY);
    expect(getClientIp(behindProxy({ forwarded: "for=6.6.6.6, for=_gazonk" }), fwd)).toBe(PROXY);
  });

  test("an element without for= stops the walk", () => {
    expect(getClientIp(behindProxy({ forwarded: "for=6.6.6.6, proto=https" }), fwd)).toBe(PROXY);
  });

  test.each([
    ["missing value", "for="],
    ["missing key", "=192.0.2.1"],
    ["no equals sign", "for"],
    ["not an IP", "for=not-an-ip"],
    ["space around equals", "for = 192.0.2.1"],
    ["unterminated quote", 'for="192.0.2.1'],
    ["duplicate for", "for=192.0.2.1;for=192.0.2.2"],
    ["bare token", "not-valid"],
    ["whitespace only", "   "],
  ])("malformed header (%s) falls back to the proxy", (_label, forwarded) => {
    expect(getClientIp(behindProxy({ forwarded }), fwd)).toBe(PROXY);
  });

  test("joins array header values in order", () => {
    const req = behindProxy({ forwarded: ["for=192.0.2.60", "for=192.0.2.61"] as unknown as string });
    expect(getClientIp(req, fwd)).toBe("192.0.2.61");
  });

  test("ignores X-Forwarded-For when Forwarded is selected", () => {
    const req = behindProxy({ forwarded: "for=203.0.113.9", "x-forwarded-for": "6.6.6.6" });
    expect(getClientIp(req, fwd)).toBe("203.0.113.9");
  });
});
