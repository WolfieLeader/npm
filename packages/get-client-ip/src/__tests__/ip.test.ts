import type { Request } from "express";
import { describe, expect, test, vi } from "vitest";
import { getClientIp } from "~/index.js";

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    socket: { remoteAddress: undefined },
    ip: undefined,
    ...overrides,
  } as unknown as Request;
}

describe("getClientIp", () => {
  describe("standalone usage", () => {
    test("returns undefined when no IP is found", () => {
      const req = mockReq();
      expect(getClientIp(req)).toBeUndefined();
    });

    test("throws when req is undefined", () => {
      expect(() => getClientIp(undefined as unknown as Request)).toThrow("Request is undefined");
    });

    test("extracts IP from req.ip", () => {
      const req = mockReq({ ip: "10.0.0.1" } as Partial<Request>);
      expect(getClientIp(req)).toBe("10.0.0.1");
    });

    test("extracts IP from x-forwarded-for header", () => {
      const req = mockReq({ headers: { "x-forwarded-for": "192.168.1.1" } });
      expect(getClientIp(req)).toBe("192.168.1.1");
    });

    test("extracts first valid IP from comma-separated x-forwarded-for", () => {
      const req = mockReq({ headers: { "x-forwarded-for": "192.168.1.1, 10.0.0.2, 172.16.0.3" } });
      expect(getClientIp(req)).toBe("192.168.1.1");
    });

    test("skips invalid IPs in comma-separated header", () => {
      const req = mockReq({ headers: { "x-forwarded-for": "not-an-ip, 10.0.0.2" } });
      expect(getClientIp(req)).toBe("10.0.0.2");
    });

    test("extracts IP from x-real-ip header", () => {
      const req = mockReq({ headers: { "x-real-ip": "172.16.0.1" } });
      expect(getClientIp(req)).toBe("172.16.0.1");
    });

    test("extracts IP from cf-connecting-ip header", () => {
      const req = mockReq({ headers: { "cf-connecting-ip": "203.0.113.50" } });
      expect(getClientIp(req)).toBe("203.0.113.50");
    });

    test("extracts IPv6 address from header", () => {
      const req = mockReq({ headers: { "x-forwarded-for": "::1" } });
      expect(getClientIp(req)).toBe("::1");
    });

    test("extracts IP from req.socket.remoteAddress", () => {
      const req = mockReq({ socket: { remoteAddress: "127.0.0.1" } } as Partial<Request>);
      expect(getClientIp(req)).toBe("127.0.0.1");
    });

    test("returns undefined when headers is undefined", () => {
      const req = mockReq({ headers: undefined as unknown as Request["headers"] });
      expect(getClientIp(req)).toBeUndefined();
    });

    test("handles array header values", () => {
      const req = mockReq({ headers: { "x-client-ip": ["10.0.0.1", "10.0.0.2"] as unknown as string } });
      expect(getClientIp(req)).toBe("10.0.0.1");
    });

    test("skips invalid array header values", () => {
      const req = mockReq({ headers: { "x-client-ip": ["invalid", "also-invalid"] as unknown as string } });
      expect(getClientIp(req)).toBeUndefined();
    });

    test("splits comma-separated values inside array headers", () => {
      const req = mockReq({ headers: { "x-client-ip": ["invalid, 10.0.0.2"] as unknown as string } });
      expect(getClientIp(req)).toBe("10.0.0.2");
    });

    test("parses IPv4 with port from non-forwarded headers", () => {
      const req = mockReq({ headers: { "x-forwarded-for": "192.168.1.1:8080" } });
      expect(getClientIp(req)).toBe("192.168.1.1");
    });

    test("ignores forwarding headers when remoteAddress is public", () => {
      const req = mockReq({
        headers: { "x-forwarded-for": "10.0.0.1" },
        socket: { remoteAddress: "203.0.113.10" },
      } as unknown as Partial<Request>);
      expect(getClientIp(req)).toBe("203.0.113.10");
    });
  });

  describe("RFC 7239 forwarded header", () => {
    test("parses standard forwarded header", () => {
      const req = mockReq({ headers: { forwarded: "for=192.0.2.43" } });
      expect(getClientIp(req)).toBe("192.0.2.43");
    });

    test("parses forwarded header with quotes", () => {
      const req = mockReq({ headers: { forwarded: 'for="192.0.2.43"' } });
      expect(getClientIp(req)).toBe("192.0.2.43");
    });

    test("parses forwarded header with proto", () => {
      const req = mockReq({ headers: { forwarded: "for=192.0.2.43;proto=https" } });
      expect(getClientIp(req)).toBe("192.0.2.43");
    });

    test("parses forwarded header with IPv6 in brackets", () => {
      const req = mockReq({ headers: { forwarded: 'for="[::1]"' } });
      expect(getClientIp(req)).toBe("::1");
    });

    test("ignores invalid forwarded header", () => {
      const req = mockReq({ headers: { forwarded: "not-valid" } });
      expect(getClientIp(req)).toBeUndefined();
    });

    test("parses forwarded header arrays", () => {
      const req = mockReq({ headers: { forwarded: ["for=192.0.2.60", "for=192.0.2.61"] as unknown as string } });
      expect(getClientIp(req)).toBe("192.0.2.60");
    });
  });

  describe("header priority ordering", () => {
    test("req.ip beats all headers", () => {
      const req = mockReq({
        ip: "1.1.1.1",
        headers: { forwarded: "for=2.2.2.2", "cf-connecting-ip": "3.3.3.3", "x-forwarded-for": "4.4.4.4" },
      } as unknown as Partial<Request>);
      expect(getClientIp(req)).toBe("1.1.1.1");
    });

    test("Forwarded beats all LOOKUP_HEADERS", () => {
      const req = mockReq({
        headers: { forwarded: "for=2.2.2.2", "cf-connecting-ip": "3.3.3.3", "x-forwarded-for": "4.4.4.4" },
      });
      expect(getClientIp(req)).toBe("2.2.2.2");
    });

    test("CDN header (cf-connecting-ip) beats generic header (x-forwarded-for)", () => {
      const req = mockReq({
        headers: { "cf-connecting-ip": "3.3.3.3", "x-forwarded-for": "4.4.4.4", "x-real-ip": "5.5.5.5" },
      });
      expect(getClientIp(req)).toBe("3.3.3.3");
    });

    test("true-client-ip beats x-forwarded-for", () => {
      const req = mockReq({
        headers: { "true-client-ip": "6.6.6.6", "x-forwarded-for": "4.4.4.4" },
      });
      expect(getClientIp(req)).toBe("6.6.6.6");
    });

    test("x-forwarded-for beats x-real-ip", () => {
      const req = mockReq({
        headers: { "x-forwarded-for": "4.4.4.4", "x-real-ip": "5.5.5.5" },
      });
      expect(getClientIp(req)).toBe("4.4.4.4");
    });

    test("headers beat req.socket.remoteAddress", () => {
      const req = mockReq({
        headers: { "x-real-ip": "5.5.5.5" },
        socket: { remoteAddress: "127.0.0.1" },
      } as unknown as Partial<Request>);
      expect(getClientIp(req)).toBe("5.5.5.5");
    });
  });

  describe("IPv6 trusted proxy detection", () => {
    test("trusts headers when remoteAddress is ::1 (IPv6 loopback)", () => {
      const req = mockReq({
        headers: { "x-forwarded-for": "203.0.113.50" },
        socket: { remoteAddress: "::1" },
      } as unknown as Partial<Request>);
      expect(getClientIp(req)).toBe("203.0.113.50");
    });

    test("trusts headers when remoteAddress is fe80:: (link-local)", () => {
      const req = mockReq({
        headers: { "x-forwarded-for": "203.0.113.50" },
        socket: { remoteAddress: "fe80::1" },
      } as unknown as Partial<Request>);
      expect(getClientIp(req)).toBe("203.0.113.50");
    });

    test("trusts headers when remoteAddress is fd:: (ULA)", () => {
      const req = mockReq({
        headers: { "x-forwarded-for": "203.0.113.50" },
        socket: { remoteAddress: "fd12::1" },
      } as unknown as Partial<Request>);
      expect(getClientIp(req)).toBe("203.0.113.50");
    });

    test("trusts headers when remoteAddress is fc:: (ULA)", () => {
      const req = mockReq({
        headers: { "x-forwarded-for": "203.0.113.50" },
        socket: { remoteAddress: "fc00::1" },
      } as unknown as Partial<Request>);
      expect(getClientIp(req)).toBe("203.0.113.50");
    });

    test("trusts headers when remoteAddress is ::ffff:127.0.0.1 (IPv4-mapped loopback)", () => {
      const req = mockReq({
        headers: { "x-forwarded-for": "203.0.113.50" },
        socket: { remoteAddress: "::ffff:127.0.0.1" },
      } as unknown as Partial<Request>);
      expect(getClientIp(req)).toBe("203.0.113.50");
    });

    test("trusts headers when remoteAddress is ::ffff:10.0.0.1 (IPv4-mapped private)", () => {
      const req = mockReq({
        headers: { "x-forwarded-for": "203.0.113.50" },
        socket: { remoteAddress: "::ffff:10.0.0.1" },
      } as unknown as Partial<Request>);
      expect(getClientIp(req)).toBe("203.0.113.50");
    });

    test("trusts headers when remoteAddress is ::ffff:192.168.1.1 (IPv4-mapped private)", () => {
      const req = mockReq({
        headers: { "x-forwarded-for": "203.0.113.50" },
        socket: { remoteAddress: "::ffff:192.168.1.1" },
      } as unknown as Partial<Request>);
      expect(getClientIp(req)).toBe("203.0.113.50");
    });

    test("trusts headers when remoteAddress is ::ffff:172.20.0.1 (IPv4-mapped private)", () => {
      const req = mockReq({
        headers: { "x-forwarded-for": "203.0.113.50" },
        socket: { remoteAddress: "::ffff:172.20.0.1" },
      } as unknown as Partial<Request>);
      expect(getClientIp(req)).toBe("203.0.113.50");
    });

    test("ignores headers when remoteAddress is public IPv6", () => {
      const req = mockReq({
        headers: { "x-forwarded-for": "10.0.0.1" },
        socket: { remoteAddress: "2001:db8::1" },
      } as unknown as Partial<Request>);
      expect(getClientIp(req)).toBe("2001:db8::1");
    });

    test("ignores headers when remoteAddress is ::ffff:<public> (IPv4-mapped public)", () => {
      const req = mockReq({
        headers: { "x-forwarded-for": "10.0.0.1" },
        socket: { remoteAddress: "::ffff:203.0.113.10" },
      } as unknown as Partial<Request>);
      expect(getClientIp(req)).toBe("::ffff:203.0.113.10");
    });
  });

  describe("middleware usage", () => {
    test("calls next() and populates req.clientIp when IP found", () => {
      const req = mockReq({ headers: { "x-forwarded-for": "10.0.0.1" } });
      const next = vi.fn();
      const result = getClientIp(req, undefined, next);

      expect(result).toBe("10.0.0.1");
      expect(req.clientIp).toBe("10.0.0.1");
      expect(req.clientIps).toEqual(["10.0.0.1"]);
      expect(next).toHaveBeenCalledOnce();
    });

    test("calls next() even when no IP is found (CRITICAL-3 regression)", () => {
      const req = mockReq();
      const next = vi.fn();
      const result = getClientIp(req, undefined, next);

      expect(result).toBeUndefined();
      expect(next).toHaveBeenCalledOnce();
    });

    test("populates clientIps with all valid IPs from comma-separated header", () => {
      const req = mockReq({ headers: { "x-forwarded-for": "10.0.0.1, 10.0.0.2" } });
      const next = vi.fn();
      getClientIp(req, undefined, next);

      expect(req.clientIps).toEqual(["10.0.0.1", "10.0.0.2"]);
      expect(next).toHaveBeenCalledOnce();
    });

    test("calls next() when IP from socket", () => {
      const req = mockReq({ socket: { remoteAddress: "127.0.0.1" } } as Partial<Request>);
      const next = vi.fn();
      getClientIp(req, undefined, next);

      expect(req.clientIp).toBe("127.0.0.1");
      expect(next).toHaveBeenCalledOnce();
    });
  });
});
