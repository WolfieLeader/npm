import { parse, serialize } from "cookie";
import type { Request, Response } from "express";

/** Options for setting a cookie. */
export interface CookieOptions {
  /** Prevents client-side JavaScript access to the cookie value. */
  httpOnly?: boolean;
  /** Sends cookie only over HTTPS; required for `__Secure-` and `__Host-` prefixes. */
  secure?: boolean;
  /** Cross-site behavior; `'none'` should be paired with `secure: true`. */
  sameSite?: "strict" | "lax" | "none";
  /** Lifetime in seconds; omit for session cookie. */
  maxAge?: number;
  /** Exact expiration date/time (`Expires` attribute). */
  expires?: Date;
  /** URL path scope for the cookie (default: `'/'`). */
  path?: string;
  /** Domain scope for the cookie; omit to restrict to the current host. */
  domain?: string;
  /** Browser priority hint for the cookie. */
  priority?: "low" | "medium" | "high";
}

/**
 * Retrieves the value of a cookie from an Express request.
 *
 * @param req - The Express request object.
 * @param name - The name of the cookie to retrieve.
 * @param logError - If `true`, logs parsing errors to the console.
 * @returns The cookie value if found, otherwise `undefined`.
 */
export function getCookie(req: Request, name: string, logError = false): string | undefined {
  try {
    const header = req.get("cookie");
    if (!header) return undefined;
    const cookies = parse(header);
    return cookies[name];
  } catch (error) {
    if (logError) console.error(`Error getting cookie "${name}":`, error);
    return undefined;
  }
}

/**
 * Sets a cookie on an Express response.
 *
 * Automatically applies stricter defaults for special prefixes:
 * - `__Secure-`: Forces `secure: true` and `path: '/'`.
 * - `__Host-`: Forces `secure: true`, `path: '/'`, and removes `domain`.
 *
 * **Security note:** This is a thin wrapper — `httpOnly`, `secure`, and `sameSite`
 * all default to `undefined` (absent). For session or auth cookies, always set
 * `{ httpOnly: true, secure: true, sameSite: "lax" }` explicitly to mitigate
 * XSS and CSRF risks.
 *
 * @param res - The Express response object.
 * @param name - The name of the cookie to set.
 * @param value - The value of the cookie.
 * @param options - Configuration for the cookie's attributes.
 * @param logError - If `true`, logs serialization errors to the console.
 * @returns `true` if the cookie was set successfully, otherwise `false`.
 */
export function setCookie(
  res: Response,
  name: string,
  value: string,
  options: CookieOptions,
  logError = false,
): boolean {
  try {
    let cookieOptions = { ...options, path: options.path || "/" };

    if (name.startsWith("__Secure-")) {
      cookieOptions = { ...cookieOptions, secure: true };
    } else if (name.startsWith("__Host-")) {
      cookieOptions = { ...cookieOptions, secure: true, path: "/", domain: undefined };
    }

    const serialized = serialize(name, value, cookieOptions);
    res.append("Set-Cookie", serialized);
    return true;
  } catch (error) {
    if (logError) {
      console.error(`Error setting cookie "${name}" with options "${JSON.stringify(options)}": ${error}`);
    }
    return false;
  }
}

/**
 * Deletes a cookie by setting its `Max-Age` to 0.
 *
 * @param res - The Express response object.
 * @param name - The name of the cookie to delete.
 * @param options - Additional options for deleting the cookie (e.g., `path`, `domain`).
 * @param logError - If `true`, logs errors to the console.
 * @returns `true` if the deletion request was added successfully, otherwise `false`.
 */
export function deleteCookie(res: Response, name: string, options: CookieOptions = {}, logError = false): boolean {
  return setCookie(res, name, "", { ...options, maxAge: 0 }, logError);
}
