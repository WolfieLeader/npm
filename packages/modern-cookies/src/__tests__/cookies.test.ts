import type { Request, Response } from "express";
import { describe, expect, test, vi } from "vitest";
import { deleteCookie, getCookie, setCookie } from "~/index.js";

function mockReq(cookieHeader?: string): Request {
  return {
    get: (name: string) => (name.toLowerCase() === "cookie" ? cookieHeader : undefined),
  } as unknown as Request;
}

function mockRes(): Response & { _cookies: string[] } {
  const cookies: string[] = [];
  return {
    _cookies: cookies,
    append: vi.fn((name: string, value: string) => {
      if (name === "Set-Cookie") cookies.push(value);
    }),
  } as unknown as Response & { _cookies: string[] };
}

describe("getCookie", () => {
  test("returns cookie value when present", () => {
    const req = mockReq("session=abc123; theme=dark");
    expect(getCookie(req, "session")).toBe("abc123");
    expect(getCookie(req, "theme")).toBe("dark");
  });

  test("returns undefined for missing cookie", () => {
    const req = mockReq("session=abc123");
    expect(getCookie(req, "missing")).toBeUndefined();
  });

  test("returns undefined when no cookie header", () => {
    const req = mockReq();
    expect(getCookie(req, "session")).toBeUndefined();
  });

  test("handles percent-encoded cookie values", () => {
    const req = mockReq("token=a%20b%3Dc");
    expect(getCookie(req, "token")).toBe("a b=c");
  });
});

describe("setCookie", () => {
  test("sets a basic cookie", () => {
    const res = mockRes();
    const result = setCookie(res, "session", "abc123", { httpOnly: true, maxAge: 60 });

    expect(result).toBe(true);
    expect(res.append).toHaveBeenCalledWith("Set-Cookie", expect.stringContaining("session=abc123"));
    expect(res._cookies[0]).toContain("HttpOnly");
    expect(res._cookies[0]).toContain("Max-Age=60");
  });

  test("defaults path to /", () => {
    const res = mockRes();
    setCookie(res, "test", "val", {});
    expect(res._cookies[0]).toContain("Path=/");
  });

  test("respects custom path", () => {
    const res = mockRes();
    setCookie(res, "test", "val", { path: "/admin" });
    expect(res._cookies[0]).toContain("Path=/admin");
  });

  describe("__Secure- prefix", () => {
    test("forces secure: true", () => {
      const res = mockRes();
      setCookie(res, "__Secure-session", "abc", {});
      expect(res._cookies[0]).toContain("Secure");
    });

    test("preserves custom path for __Secure-", () => {
      const res = mockRes();
      setCookie(res, "__Secure-session", "abc", { path: "/admin" });
      expect(res._cookies[0]).toContain("Path=/admin");
    });

    test("enforces secure for lowercase __secure- prefix", () => {
      const res = mockRes();
      setCookie(res, "__secure-session", "abc", {});
      expect(res._cookies[0]).toContain("Secure");
    });
  });

  describe("__Host- prefix", () => {
    test("forces secure: true and path: /", () => {
      const res = mockRes();
      setCookie(res, "__Host-session", "abc", {});
      expect(res._cookies[0]).toContain("Secure");
      expect(res._cookies[0]).toContain("Path=/");
    });

    test("overrides custom path to / (CRITICAL-2 regression)", () => {
      const res = mockRes();
      setCookie(res, "__Host-session", "abc", { path: "/admin" });
      expect(res._cookies[0]).toContain("Path=/");
      expect(res._cookies[0]).not.toContain("Path=/admin");
    });

    test("removes domain for __Host-", () => {
      const res = mockRes();
      setCookie(res, "__Host-session", "abc", { domain: "example.com" });
      expect(res._cookies[0]).not.toContain("Domain");
    });
  });
});

describe("deleteCookie", () => {
  test("sets maxAge to 0", () => {
    const res = mockRes();
    const result = deleteCookie(res, "session", { httpOnly: true });
    expect(result).toBe(true);
    expect(res._cookies[0]).toContain("Max-Age=0");
  });

  test("sets empty value", () => {
    const res = mockRes();
    deleteCookie(res, "session", {});
    expect(res._cookies[0]).toContain("session=");
  });
});

describe("sameSite=none enforcement", () => {
  test("forces secure: true when sameSite is none", () => {
    const res = mockRes();
    setCookie(res, "token", "abc", { sameSite: "none" });
    expect(res._cookies[0]).toContain("Secure");
    expect(res._cookies[0]).toContain("SameSite=None");
  });

  test("works when secure is already true", () => {
    const res = mockRes();
    setCookie(res, "token", "abc", { sameSite: "none", secure: true });
    expect(res._cookies[0]).toContain("Secure");
    expect(res._cookies[0]).toContain("SameSite=None");
  });

  test("normalizes sameSite casing and still enforces secure", () => {
    const res = mockRes();
    setCookie(res, "token", "abc", { sameSite: "None" as "none", secure: false });
    expect(res._cookies[0]).toContain("Secure");
    expect(res._cookies[0]).toContain("SameSite=None");
  });
});

describe("error logging", () => {
  test("does not log cookie value in error (WARN-10)", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = {
      append: () => {
        throw new Error("Serialize failed");
      },
    } as unknown as Response;

    setCookie(res, "token", "secret-session-value", {}, true);
    expect(consoleSpy).toHaveBeenCalled();
    const logMessage = consoleSpy.mock.calls[0]?.[0] as string;
    expect(logMessage).not.toContain("secret-session-value");
    consoleSpy.mockRestore();
  });

  test("sanitizes cookie name in logs", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = {
      append: () => {
        throw new Error("Serialize\nfailed");
      },
    } as unknown as Response;

    setCookie(res, "token\nname", "value", {}, true);
    expect(consoleSpy).toHaveBeenCalled();
    const metadata = consoleSpy.mock.calls[0]?.[1] as { name: string; reason: string };
    expect(metadata.name).not.toContain("\n");
    expect(metadata.reason).not.toContain("\n");
    consoleSpy.mockRestore();
  });

  test("does not throw if console.error throws", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {
      throw new Error("logger failure");
    });
    const res = {
      append: () => {
        throw new Error("Serialize failed");
      },
    } as unknown as Response;

    expect(setCookie(res, "token", "value", {}, true)).toBe(false);
    consoleSpy.mockRestore();
  });
});
