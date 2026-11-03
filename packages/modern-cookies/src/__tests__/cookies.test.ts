import { describe, expect, test, vi } from "vitest";
import { deleteCookie, getCookie, setCookie } from "~/index.js";
import type { CookieLogger, CookieOptions, CookieRequest, CookieResponse } from "~/index.js";

function mockReq(cookieHeader?: string): CookieRequest {
  return {
    get: (name: string) => (name.toLowerCase() === "cookie" ? cookieHeader : undefined),
  };
}

function mockRes(): CookieResponse & { _cookies: string[] } {
  const cookies: string[] = [];
  return {
    _cookies: cookies,
    append: vi.fn<CookieResponse["append"]>((name, value) => {
      if (name === "Set-Cookie") cookies.push(...[value].flat());
    }),
  };
}

function failingRes(message: string): CookieResponse {
  return {
    append: () => {
      throw new Error(message);
    },
  };
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

  test("returns the first value of a doubled name and logs it, since a planted twin may be sent first", () => {
    const logger = vi.fn<CookieLogger>();
    expect(getCookie(mockReq("s=attacker; s=real"), "s", { logger })).toBe("attacker");
    expect(logger.mock.calls).toStrictEqual([
      [
        'Error getting cookie "s": the Cookie header has this name more than once, so one may be planted; returned the first',
      ],
    ]);
  });

  test("counts a name with spaces and tabs around it as doubled, as the parser trims them", () => {
    const logger = vi.fn<CookieLogger>();
    expect(getCookie(mockReq("s=1;\t s \t=2"), "s", { logger })).toBe("1");
    expect(logger.mock.calls.length).toBe(1);
  });

  test("reads a name sent once while another name is doubled", () => {
    expect(getCookie(mockReq("a=1; b=2; a=3"), "b")).toBe("2");
  });

  test("treats names that differ in case or by a prefix as different names", () => {
    expect(getCookie(mockReq("__Host-s=1; __host-s=2; s=3; session=4"), "__Host-s")).toBe("1");
    expect(getCookie(mockReq("__Host-s=1; __host-s=2; s=3; session=4"), "s")).toBe("3");
  });

  test("passes parse errors to options.logger", () => {
    const logger = vi.fn<CookieLogger>();
    const req: CookieRequest = {
      get: () => {
        throw new Error("Header read failure");
      },
    };

    expect(getCookie(req, "session", { logger })).toBeUndefined();
    expect(logger).toHaveBeenCalledWith('Error getting cookie "session": Header read failure');
  });

  test("never writes to the console", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const req: CookieRequest = {
      get: () => {
        throw new Error("Header read failure");
      },
    };

    expect(getCookie(req, "session")).toBeUndefined();
    expect(setCookie(mockRes(), "", "v", {})).toBe(false);
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
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

  test.each([undefined, null])("returns false, not a throw, when a JS caller passes %s as options", (options) => {
    const res = mockRes();
    expect(setCookie(res, "test", "val", options as unknown as CookieOptions)).toBe(false);
    expect(res._cookies).toHaveLength(0);
  });

  test("returns false and undefined, not a throw, when an options getter throws", () => {
    const options = {
      get logger(): CookieLogger {
        throw new Error("getter");
      },
    } as CookieOptions;
    expect(setCookie(mockRes(), "test", "val", options)).toBe(false);
    expect(deleteCookie(mockRes(), "test", options)).toBe(false);
    const throwingReq: CookieRequest = {
      get: () => {
        throw new Error("header");
      },
    };
    expect(getCookie(throwingReq, "test", options)).toBeUndefined();
  });

  test("returns false on invalid sameSite value", () => {
    const res = mockRes();
    const result = setCookie(res, "test", "val", { sameSite: "invalid" as "strict" });
    expect(result).toBe(false);
    expect(res._cookies).toHaveLength(0);
  });

  test("sets sameSite to strict", () => {
    const res = mockRes();
    setCookie(res, "test", "val", { sameSite: "strict" });
    expect(res._cookies[0]).toContain("SameSite=Strict");
  });

  test("sets sameSite to lax", () => {
    const res = mockRes();
    setCookie(res, "test", "val", { sameSite: "lax" });
    expect(res._cookies[0]).toContain("SameSite=Lax");
  });

  test("sets expires option", () => {
    const res = mockRes();
    const date = new Date("2030-01-01T00:00:00Z");
    setCookie(res, "test", "val", { expires: date });
    expect(res._cookies[0]).toContain("Expires=");
  });

  test("sets domain option", () => {
    const res = mockRes();
    setCookie(res, "test", "val", { domain: "example.com" });
    expect(res._cookies[0]).toContain("Domain=example.com");
  });

  test("sets priority option", () => {
    const res = mockRes();
    setCookie(res, "test", "val", { priority: "high" });
    expect(res._cookies[0]).toContain("Priority=High");
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

    test("enforces secure for lowercase __secure- prefix (browsers match case-insensitively)", () => {
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

  test("sets expires to the Unix epoch", () => {
    const res = mockRes();
    deleteCookie(res, "session");
    expect(res._cookies[0]).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  });

  test("enforces __Host- prefix security on delete", () => {
    const res = mockRes();
    deleteCookie(res, "__Host-session", { domain: "example.com", path: "/admin" });
    expect(res._cookies[0]).toContain("Secure");
    expect(res._cookies[0]).toContain("Path=/");
    expect(res._cookies[0]).not.toContain("Path=/admin");
    expect(res._cookies[0]).not.toContain("Domain");
  });

  test("enforces __Secure- prefix security on delete", () => {
    const res = mockRes();
    deleteCookie(res, "__Secure-session");
    expect(res._cookies[0]).toContain("Secure");
  });
});

describe("edge cases", () => {
  test("returns false for empty cookie name", () => {
    const res = mockRes();
    const result = setCookie(res, "", "value", {});
    expect(result).toBe(false);
    expect(res._cookies).toHaveLength(0);
  });

  test.each(["__HOST-session", "__host-sid", "__HoSt-x"])("enforces __Host- rules for %s", (name) => {
    const res = mockRes();
    setCookie(res, name, "abc", { path: "/admin", domain: "example.com" });
    expect(res._cookies[0]).toBe(`${name}=abc; Path=/; Secure`);
  });

  test.each(["__SECURE-token", "__SeCuRe-token"])("enforces __Secure- rules for %s", (name) => {
    const res = mockRes();
    setCookie(res, name, "abc", { path: "/admin" });
    expect(res._cookies[0]).toBe(`${name}=abc; Path=/admin; Secure`);
  });

  test("does not treat a name that only contains the prefix as prefixed", () => {
    const res = mockRes();
    setCookie(res, "x__Host-session", "abc", { path: "/admin" });
    expect(res._cookies[0]).toBe("x__Host-session=abc; Path=/admin");
  });

  test("deleteCookie enforces __Host- rules for a lowercase prefix", () => {
    const res = mockRes();
    deleteCookie(res, "__host-sid", { domain: "example.com", path: "/admin" });
    expect(res._cookies[0]).toContain("Secure");
    expect(res._cookies[0]).not.toContain("Domain");
    expect(res._cookies[0]).not.toContain("Path=/admin");
  });
});

describe("cookie edge cases - extended", () => {
  test("very long cookie name (2000+ chars)", () => {
    const res = mockRes();
    const longName = "x".repeat(2000);
    const result = setCookie(res, longName, "val", {});
    // Should not crash - cookie library handles serialization
    expect(typeof result).toBe("boolean");
  });

  test("cookie value with unicode", () => {
    const res = mockRes();
    const result = setCookie(res, "test", "café ☕", {});
    expect(result).toBe(true);
    expect(res._cookies[0]).toContain("test=");
  });

  test("getCookie with malformed header (;;;)", () => {
    const req = mockReq(";;;");
    const result = getCookie(req, "test");
    expect(result).toBeUndefined();
  });

  test("getCookie with empty name", () => {
    const req = mockReq("=value; test=abc");
    const result = getCookie(req, "");
    // The cookie spec says empty-name cookies parse as the value before first =
    // Behavior depends on the `cookie` library — just verify no crash
    expect(result === undefined || typeof result === "string").toBe(true);
  });

  test("deleteCookie preserves custom domain (non-__Host- case)", () => {
    const res = mockRes();
    deleteCookie(res, "session", { domain: "example.com" });
    expect(res._cookies[0]).toContain("Domain=example.com");
    expect(res._cookies[0]).toContain("Max-Age=0");
  });

  test("maxAge: -1 behavior", () => {
    const res = mockRes();
    setCookie(res, "test", "val", { maxAge: -1 });
    expect(res._cookies[0]).toContain("Max-Age=-1");
  });

  test("setCookie where res.append throws non-Error object", () => {
    const thrown: unknown = "string error";
    const res: CookieResponse = {
      append: () => {
        throw thrown;
      },
    };
    const result = setCookie(res, "test", "val", {});
    expect(result).toBe(false);
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
    setCookie(res, "token", "abc", { sameSite: "None", secure: false });
    expect(res._cookies[0]).toContain("Secure");
    expect(res._cookies[0]).toContain("SameSite=None");
  });
});

describe("error logging", () => {
  test("does not log cookie value in error (WARN-10)", () => {
    const logger = vi.fn<CookieLogger>();
    setCookie(failingRes("Serialize failed"), "token", "secret-session-value", { logger });
    expect(logger).toHaveBeenCalledOnce();
    expect(logger.mock.calls[0]?.[0]).not.toContain("secret-session-value");
  });

  test("sanitizes cookie name and reason in logs", () => {
    const logger = vi.fn<CookieLogger>();
    setCookie(failingRes("Serialize\nfailed"), "token", "value", { logger });
    expect(logger).toHaveBeenLastCalledWith('Error setting cookie "token": Serialize failed');
    setCookie(mockRes(), "token\nname", "value", { logger });
    expect(logger).toHaveBeenLastCalledWith('Error setting cookie "token name": argument name is invalid: token name');
  });

  test("replaces every ASCII control character and keeps other characters", () => {
    const logger = vi.fn<CookieLogger>();
    setCookie(failingRes("a\u0000b\u001Fc\u007Fd\u0080é😀"), "token", "value", { logger });
    expect(logger).toHaveBeenLastCalledWith('Error setting cookie "token": a b c d\u0080é😀');
  });

  test("deleteCookie passes errors to options.logger", () => {
    const logger = vi.fn<CookieLogger>();
    expect(deleteCookie(failingRes("boom"), "session", { logger })).toBe(false);
    expect(logger).toHaveBeenCalledWith('Error setting cookie "session": boom');
  });

  test("does not throw if the logger throws", () => {
    const logger = vi.fn<CookieLogger>(() => {
      throw new Error("logger failure");
    });
    expect(setCookie(failingRes("Serialize failed"), "token", "value", { logger })).toBe(false);
    expect(
      getCookie(
        {
          get: () => {
            throw new Error("x");
          },
        },
        "a",
        { logger },
      ),
    ).toBeUndefined();
  });

  test("does not put the logger into the Set-Cookie header", () => {
    const res = mockRes();
    setCookie(res, "a", "1", { logger: vi.fn<CookieLogger>(), httpOnly: true });
    expect(res._cookies[0]).toBe("a=1; Path=/; HttpOnly");
  });
});
