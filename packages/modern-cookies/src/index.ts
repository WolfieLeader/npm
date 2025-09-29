import { parse, serialize } from "cookie";
import type { Request, Response } from "express";

/**
 * Represents options for setting cookies.
 * These options can be used to configure various attributes of the cookie.
 */
export interface CookieOptions {
  /** Specifies the `HttpOnly` attribute for the cookie. */
  httpOnly?: boolean;
  /** Specifies the `Secure` attribute for the cookie. */
  secure?: boolean;
  /** Specifies the `SameSite` attribute for the cookie. */
  sameSite?: "strict" | "lax" | "none";
  /** Specifies the `number` (in seconds) the cookie will be valid for. */
  maxAge?: number;
  /** Specifies the exact date/time when the cookie expires (`Expires`). */
  expires?: Date;
  /** Specifies the `Path` attribute for the cookie. */
  path?: string;
  /** Specifies the `Domain` attribute for the cookie. */
  domain?: string;
  /** Specifies the `Priority` attribute for the cookie. */
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
      cookieOptions = { ...cookieOptions, secure: true, domain: undefined };
    }

    const serialized = serialize(name, value, cookieOptions);
    res.append("Set-Cookie", serialized);
    return true;
  } catch (error) {
    if (logError) {
      console.error(
        `Error setting cookie "${name}", with value "${value}", and options "${JSON.stringify(options)}": ${error}`,
      );
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
export function deleteCookie(res: Response, name: string, options: CookieOptions, logError = false): boolean {
  return setCookie(res, name, "", { ...options, maxAge: 0 }, logError);
}
