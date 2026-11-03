import { describe, expect, expectTypeOf, test, vi } from "vitest";
import { DEFAULT_TRUSTED_PROXIES, getClientIp, getClientIpMiddleware } from "~/index.js";
import type { GetClientIpOptions, IpRequest } from "~/index.js";

const PROXY = "10.0.0.5";

function mockReq(overrides: Partial<IpRequest> = {}): IpRequest {
  return {
    headers: {},
    socket: { remoteAddress: "127.0.0.1" },
    ip: undefined,
    ...overrides,
  };
}

function behindProxy(headers: IpRequest["headers"], remoteAddress = PROXY): IpRequest {
  return mockReq({ headers, socket: { remoteAddress } });
}

function spoofedFromPublicPeer(): IpRequest {
  return behindProxy({ "x-forwarded-for": "6.6.6.6" }, "203.0.113.1");
}

describe("getClientIp", () => {
  describe("standalone usage", () => {
    test("returns undefined when no IP is found", () => {
      const req = mockReq({ socket: { remoteAddress: undefined } });
      expect(getClientIp(req)).toBeUndefined();
    });

    test("falls back to socket remoteAddress when no headers present", () => {
      expect(getClientIp(mockReq())).toBe("127.0.0.1");
    });

    test("throws when req is undefined", () => {
      expect(() => getClientIp(undefined as unknown as IpRequest)).toThrow("Request is undefined");
    });

    test("returns undefined when headers and socket address are missing", () => {
      const req = mockReq({
        headers: undefined as unknown as IpRequest["headers"],
        socket: { remoteAddress: undefined },
      });
      expect(getClientIp(req)).toBeUndefined();
    });

    test("ignores forwarding headers when socket is absent", () => {
      const req = mockReq({ headers: { "x-forwarded-for": "10.0.0.1" }, socket: undefined });
      expect(getClientIp(req)).toBeUndefined();
    });

    test("sets req.clientIp and req.clientIps", () => {
      const req = behindProxy({ "x-forwarded-for": "203.0.113.9" });
      getClientIp(req);
      expect(req.clientIp).toBe("203.0.113.9");
      expect(req.clientIps).toStrictEqual(["203.0.113.9", PROXY]);
    });
  });

  describe("framework req.ip (Express trust proxy)", () => {
    test("returns req.ip", () => {
      expect(getClientIp(mockReq({ ip: "10.0.0.1" }))).toBe("10.0.0.1");
    });

    test("req.ip beats forwarding headers", () => {
      const req = mockReq({ ip: "1.1.1.1", headers: { "x-forwarded-for": "4.4.4.4", "cf-connecting-ip": "3.3.3.3" } });
      expect(getClientIp(req)).toBe("1.1.1.1");
    });

    test("normalizes IPv4-mapped req.ip to IPv4", () => {
      expect(getClientIp(mockReq({ ip: "::ffff:203.0.113.9" }))).toBe("203.0.113.9");
    });

    test("Express without trust proxy behind a loopback proxy: walks XFF past a client-prepended entry", () => {
      // Express sets req.ip to the socket address when trust proxy is off.
      const req = mockReq({ ip: "127.0.0.1", headers: { "x-forwarded-for": "6.6.6.6, 203.0.113.9" } });
      expect(getClientIp(req)).toBe("203.0.113.9");
      expect(req.clientIps).toStrictEqual(["203.0.113.9", "127.0.0.1"]);
    });

    test("Express with trust proxy: an untrusted req.ip is returned unchanged", () => {
      // Express already walked XFF: "6.6.6.6, 203.0.113.9" from 127.0.0.1 gives req.ip 203.0.113.9.
      const req = mockReq({ ip: "203.0.113.9", headers: { "x-forwarded-for": "6.6.6.6, 203.0.113.9" } });
      expect(getClientIp(req)).toBe("203.0.113.9");
      expect(req.clientIps).toStrictEqual(["203.0.113.9"]);
    });

    test("an untrusted req.ip wins over forwarding headers", () => {
      const req = mockReq({ ip: "198.51.100.4", headers: { "x-forwarded-for": "203.0.113.9" } });
      expect(getClientIp(req)).toBe("198.51.100.4");
    });

    test("a trusted req.ip is kept when the chain has no untrusted hop", () => {
      const req = mockReq({ ip: "10.0.0.7", headers: { "x-forwarded-for": "192.168.0.9" } });
      expect(getClientIp(req)).toBe("10.0.0.7");
    });

    test("a trusted req.ip is kept when an unknown hop stops the walk", () => {
      const req = mockReq({ ip: "127.0.0.1", headers: { "x-forwarded-for": "6.6.6.6, garbage" } });
      expect(getClientIp(req)).toBe("127.0.0.1");
    });

    test("a trusted req.ip walks Forwarded when opted in", () => {
      const req = mockReq({ ip: "127.0.0.1", headers: { forwarded: "for=6.6.6.6, for=203.0.113.9" } });
      expect(getClientIp(req, { forwardedHeader: "forwarded" })).toBe("203.0.113.9");
    });

    test("a trusted req.ip is returned as-is when the socket peer is untrusted", () => {
      const req = mockReq({
        ip: "10.0.0.7",
        headers: { "x-forwarded-for": "6.6.6.6" },
        socket: { remoteAddress: "198.51.100.1" },
      });
      expect(getClientIp(req)).toBe("10.0.0.7");
    });

    test("trustedProxies: [] returns req.ip without reading headers", () => {
      const req = mockReq({ ip: "127.0.0.1", headers: { "x-forwarded-for": "203.0.113.9" } });
      expect(getClientIp(req, { trustedProxies: [] })).toBe("127.0.0.1");
    });

    test("falls through when req.ip is not an IP", () => {
      const req = mockReq({ ip: "not-an-ip", headers: { "x-forwarded-for": "203.0.113.50" } });
      expect(getClientIp(req)).toBe("203.0.113.50");
    });
  });

  describe("X-Forwarded-For walked from the right", () => {
    test("ignores a client-prepended entry behind a proxy", () => {
      // nginx: proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      const req = behindProxy({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" });
      expect(getClientIp(req)).toBe("203.0.113.9");
    });

    test("skips several trusted hops", () => {
      const req = behindProxy({ "x-forwarded-for": "6.6.6.6, 203.0.113.9, 10.1.1.1, 192.168.0.2" });
      expect(getClientIp(req)).toBe("203.0.113.9");
      expect(req.clientIps).toStrictEqual(["203.0.113.9", "10.1.1.1", "192.168.0.2", PROXY]);
    });

    test("returns the leftmost address when every hop is trusted", () => {
      const req = behindProxy({ "x-forwarded-for": "192.168.1.1, 10.0.0.2, 172.16.0.3" });
      expect(getClientIp(req)).toBe("192.168.1.1");
    });

    test("stops at an invalid hop and returns the nearest trusted hop", () => {
      const req = behindProxy({ "x-forwarded-for": "6.6.6.6, not-an-ip, 10.0.0.2" });
      expect(getClientIp(req)).toBe("10.0.0.2");
    });

    test("treats 0.0.0.0 as invalid", () => {
      expect(getClientIp(behindProxy({ "x-forwarded-for": "0.0.0.0" }))).toBe(PROXY);
    });

    test("ignores empty list elements", () => {
      expect(getClientIp(behindProxy({ "x-forwarded-for": "6.6.6.6,, 203.0.113.9 ," }))).toBe("203.0.113.9");
    });

    test("whitespace-only header falls back to the socket address", () => {
      expect(getClientIp(behindProxy({ "x-forwarded-for": "   " }))).toBe(PROXY);
    });

    test("joins array header values in order", () => {
      const req = behindProxy({ "x-forwarded-for": ["6.6.6.6", "203.0.113.9"] });
      expect(getClientIp(req)).toBe("203.0.113.9");
    });

    test("parses IPv4 with port and bracketed IPv6 with port", () => {
      expect(getClientIp(behindProxy({ "x-forwarded-for": "203.0.113.9:8080" }))).toBe("203.0.113.9");
      expect(getClientIp(behindProxy({ "x-forwarded-for": "[2001:db8::1]:8080" }))).toBe("2001:db8::1");
    });

    test("normalizes IPv6 and strips zone IDs", () => {
      expect(getClientIp(behindProxy({ "x-forwarded-for": "2001:DB8:0:0::1" }))).toBe("2001:db8::1");
      expect(getClientIp(behindProxy({ "x-forwarded-for": "fe80::1%eth0" }))).toBe("fe80::1");
    });

    test("normalizes IPv4-mapped hops to IPv4", () => {
      expect(getClientIp(behindProxy({ "x-forwarded-for": "::ffff:203.0.113.9" }))).toBe("203.0.113.9");
    });

    test("ignores forwarding headers when the peer is public", () => {
      const req = mockReq({ headers: { "x-forwarded-for": "10.0.0.1" }, socket: { remoteAddress: "203.0.113.10" } });
      expect(getClientIp(req)).toBe("203.0.113.10");
    });

    test("ignores the Forwarded header by default", () => {
      const req = behindProxy({ forwarded: "for=6.6.6.6", "x-forwarded-for": "203.0.113.9" });
      expect(getClientIp(req)).toBe("203.0.113.9");
    });

    test("ignores legacy headers (x-real-ip, x-client-ip, x-forwarded, forwarded-for)", () => {
      const req = behindProxy({
        "x-real-ip": "6.6.6.6",
        "x-client-ip": "6.6.6.7",
        "x-forwarded": "6.6.6.8",
        "forwarded-for": "6.6.6.9",
        "x-cluster-client-ip": "6.6.6.10",
      });
      expect(getClientIp(req)).toBe(PROXY);
    });

    test("handles 10K+ entries", () => {
      const longValue = Array.from({ length: 10_000 }, (_, i) => `10.0.${Math.floor(i / 256)}.${i % 256}`).join(", ");
      expect(getClientIp(behindProxy({ "x-forwarded-for": `6.6.6.6, ${longValue}` }))).toBe("6.6.6.6");
    });

    test("returns 255.255.255.255 as an untrusted hop", () => {
      expect(getClientIp(behindProxy({ "x-forwarded-for": "255.255.255.255" }))).toBe("255.255.255.255");
    });
  });

  describe("vendor headers require opt-in", () => {
    const vendorHeaders = [
      "cf-connecting-ip",
      "true-client-ip",
      "fastly-client-ip",
      "x-appengine-user-ip",
      "cf-pseudo-ipv4",
      "x-real-ip",
    ];

    test.each(vendorHeaders)("ignores %s without opt-in", (header) => {
      const req = behindProxy({ [header]: "6.6.6.6", "x-forwarded-for": "203.0.113.9" });
      expect(getClientIp(req)).toBe("203.0.113.9");
    });

    test.each(vendorHeaders)("reads %s with opt-in", (header) => {
      const req = behindProxy({ [header]: "198.51.100.7", "x-forwarded-for": "203.0.113.9" });
      expect(getClientIp(req, { trustedHeaders: [header] })).toBe("198.51.100.7");
      expect(req.clientIps).toStrictEqual(["198.51.100.7", PROXY]);
    });

    test("matches header names case-insensitively", () => {
      const req = behindProxy({ "cf-connecting-ip": "198.51.100.7" });
      expect(getClientIp(req, { trustedHeaders: ["CF-Connecting-IP"] })).toBe("198.51.100.7");
    });

    test("checks trusted headers in order and skips invalid values", () => {
      const req = behindProxy({ "cf-connecting-ip": "garbage", "true-client-ip": "198.51.100.8" });
      expect(getClientIp(req, { trustedHeaders: ["cf-connecting-ip", "true-client-ip"] })).toBe("198.51.100.8");
    });

    test("rejects a comma list in a single-IP header", () => {
      const req = behindProxy({ "cf-connecting-ip": "6.6.6.6, 198.51.100.7", "x-forwarded-for": "203.0.113.9" });
      expect(getClientIp(req, { trustedHeaders: ["cf-connecting-ip"] })).toBe("203.0.113.9");
    });

    test("ignores opted-in headers when the peer is public", () => {
      const req = mockReq({ headers: { "cf-connecting-ip": "6.6.6.6" }, socket: { remoteAddress: "203.0.113.10" } });
      expect(getClientIp(req, { trustedHeaders: ["cf-connecting-ip"] })).toBe("203.0.113.10");
    });

    test("an opted-in header beats req.ip", () => {
      const req = mockReq({
        ip: PROXY,
        headers: { "cf-connecting-ip": "198.51.100.7" },
        socket: { remoteAddress: PROXY },
      });
      expect(getClientIp(req, { trustedHeaders: ["cf-connecting-ip"] })).toBe("198.51.100.7");
    });
  });

  describe("trusted proxy ranges", () => {
    test.each([
      ["127.0.0.1"],
      ["10.255.0.1"],
      ["172.16.0.1"],
      ["172.31.255.255"],
      ["192.168.1.1"],
      ["169.254.1.1"],
      ["::1"],
      ["fc00::1"],
      ["fdff::1"],
      ["fe80::1"],
      ["febf::1"],
      ["::ffff:127.0.0.1"],
      ["::ffff:10.0.0.1"],
      ["::ffff:172.20.0.1"],
      ["0:0:0:0:0:ffff:c0a8:101"],
    ])("trusts peer %s", (remoteAddress) => {
      expect(getClientIp(behindProxy({ "x-forwarded-for": "203.0.113.50" }, remoteAddress))).toBe("203.0.113.50");
    });

    test.each([
      ["100.64.0.1", "100.64.0.1"],
      ["172.32.0.1", "172.32.0.1"],
      ["2001:db8::1", "2001:db8::1"],
      ["fc::1", "fc::1"],
      ["fec0::1", "fec0::1"],
      ["fbff::1", "fbff::1"],
      ["::ffff:203.0.113.10", "203.0.113.10"],
    ])("does not trust peer %s", (remoteAddress, expected) => {
      expect(getClientIp(behindProxy({ "x-forwarded-for": "10.0.0.1" }, remoteAddress))).toBe(expected);
    });

    test("custom trustedProxies replace the defaults", () => {
      const options: GetClientIpOptions = { trustedProxies: ["203.0.113.0/24"] };
      expect(getClientIp(behindProxy({ "x-forwarded-for": "6.6.6.6" }, "203.0.113.1"), options)).toBe("6.6.6.6");
      expect(getClientIp(behindProxy({ "x-forwarded-for": "6.6.6.6" }, PROXY), options)).toBe(PROXY);
    });

    test("trustedProxies can extend the defaults", () => {
      const options = { trustedProxies: [...DEFAULT_TRUSTED_PROXIES, "198.51.100.0/24"] };
      const req = behindProxy({ "x-forwarded-for": "6.6.6.6, 198.51.100.20" });
      expect(getClientIp(req, options)).toBe("6.6.6.6");
    });

    test("supports single addresses, IPv6 CIDRs, and IPv4-mapped CIDRs", () => {
      expect(
        getClientIp(behindProxy({ "x-forwarded-for": "6.6.6.6" }, "203.0.113.1"), { trustedProxies: ["203.0.113.1"] }),
      ).toBe("6.6.6.6");
      expect(
        getClientIp(behindProxy({ "x-forwarded-for": "6.6.6.6" }, "2001:db8::9"), {
          trustedProxies: ["2001:db8::/32"],
        }),
      ).toBe("6.6.6.6");
      expect(
        getClientIp(behindProxy({ "x-forwarded-for": "6.6.6.6" }, "203.0.113.1"), {
          trustedProxies: ["::ffff:203.0.113.0/120"],
        }),
      ).toBe("6.6.6.6");
    });

    test("an empty list trusts no proxy", () => {
      expect(getClientIp(behindProxy({ "x-forwarded-for": "6.6.6.6" }), { trustedProxies: [] })).toBe(PROXY);
    });

    test.each([["not-an-ip"], ["10.0.0.0/33"], ["::/129"], ["10.0.0.0/abc"], ["::ffff:1.2.3.4/64"]])(
      "throws on invalid trusted proxy %s",
      (entry) => {
        expect(() => getClientIp(mockReq(), { trustedProxies: [entry] })).toThrow(TypeError);
      },
    );

    test("throws on an invalid forwardedHeader", () => {
      expect(() => getClientIp(mockReq(), { forwardedHeader: "x-real-ip" as "forwarded" })).toThrow(TypeError);
    });
  });

  describe("middleware usage", () => {
    test("app.use(getClientIp) populates req and calls next()", () => {
      const req = behindProxy({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" });
      const next = vi.fn<() => void>();
      const result = getClientIp(req, {}, next);

      expect(result).toBeUndefined();
      expect(req.clientIp).toBe("203.0.113.9");
      expect(req.clientIps).toStrictEqual(["203.0.113.9", PROXY]);
      expect(next).toHaveBeenCalledOnce();
    });

    test("calls next() even when no IP is found", () => {
      const req = mockReq({ socket: { remoteAddress: undefined } });
      const next = vi.fn<() => void>();
      getClientIp(req, undefined, next);

      expect(req.clientIp).toBeUndefined();
      expect(next).toHaveBeenCalledOnce();
    });

    test("getClientIpMiddleware applies options", () => {
      const middleware = getClientIpMiddleware({ trustedHeaders: ["cf-connecting-ip"] });
      const req = behindProxy({ "cf-connecting-ip": "198.51.100.7" });
      const next = vi.fn<() => void>();
      middleware(req, {}, next);

      expect(req.clientIp).toBe("198.51.100.7");
      expect(next).toHaveBeenCalledOnce();
    });

    test("throws when options are passed in middleware form", () => {
      const req = behindProxy({ "x-forwarded-for": "6.6.6.6" });
      expect(() => getClientIp(req, { trustedProxies: [] }, vi.fn<() => void>())).toThrow(TypeError);
    });

    test("reads a mutated trustedProxies array on the next call", () => {
      const trustedProxies = ["127.0.0.1"];
      expect(getClientIp(spoofedFromPublicPeer(), { trustedProxies })).toBe("203.0.113.1");
      trustedProxies.push("203.0.113.1");
      expect(getClientIp(spoofedFromPublicPeer(), { trustedProxies })).toBe("6.6.6.6");
    });

    test("getClientIpMiddleware validates options at creation", () => {
      expect(() => getClientIpMiddleware({ trustedProxies: ["nope"] })).toThrow(TypeError);
    });

    test("types fit an Express-style handler", () => {
      type Handler = (req: IpRequest, res: unknown, next: (err?: unknown) => void) => void;
      expectTypeOf(getClientIp).toExtend<Handler>();
      expectTypeOf(getClientIpMiddleware()).toExtend<Handler>();
      expectTypeOf(getClientIp(mockReq())).toEqualTypeOf<string | undefined>();
    });
  });
});
