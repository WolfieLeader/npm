import { parse, serialize } from "cookie";
import type { Request, Response } from "express";

function $sanitizeForLog(input: unknown, maxLength = 160): string {
  const value = typeof input === "string" ? input : input instanceof Error ? input.message : String(input);
  return value.replace(/[\r\n\t]/g, " ").slice(0, maxLength);
}

function $safeLogCookieError(action: "getting" | "setting", name: string, error: unknown) {
  try {
    console.error(`Error ${action} cookie`, { name: $sanitizeForLog(name), reason: $sanitizeForLog(error) });
  } catch {}
}

function $normalizeSameSite(value: CookieOptions["sameSite"]): CookieOptions["sameSite"] {
  if (value === undefined) return undefined;

  const normalized = value.toLowerCase();
  if (normalized !== "strict" && normalized !== "lax" && normalized !== "none") {
    throw new Error(`Invalid sameSite value: ${value}`);
  }

  return normalized;
}

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
    if (logError) $safeLogCookieError("getting", name, error);
    return undefined;
  }
}

/**
 * Sets a cookie on an Express response.
 *
 * Automatically applies stricter defaults for special prefixes:
 * - `__Secure-`: Forces `secure: true`. Path defaults to `'/'` when not specified.
 * - `__Host-`: Forces `secure: true`, `path: '/'`, and removes `domain`.
 *
 * @example Setting a secure session cookie
 * ```ts
 * setCookie(res, "session", token, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 86400 });
 * ```
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
    const sameSite = $normalizeSameSite(options.sameSite);
    const cookieOptions = { ...options, sameSite, path: options.path || "/" };
    const normalizedName = name.toLowerCase();

    if (normalizedName.startsWith("__host-")) {
      cookieOptions.secure = true;
      cookieOptions.path = "/";
      cookieOptions.domain = undefined;
    } else if (normalizedName.startsWith("__secure-")) {
      cookieOptions.secure = true;
    }

    if (cookieOptions.sameSite === "none") {
      cookieOptions.secure = true;
    }

    const serialized = serialize(name, value, cookieOptions);
    res.append("Set-Cookie", serialized);
    return true;
  } catch (error) {
    if (logError) $safeLogCookieError("setting", name, error);
    return false;
  }
}

const UNIX_EPOCH = new Date(0);

/**
 * Deletes a cookie by setting its `Max-Age` to `0` and `Expires` to the Unix epoch.
 *
 * @param res - The Express response object.
 * @param name - The name of the cookie to delete.
 * @param options - Additional options for deleting the cookie (e.g., `path`, `domain`).
 * @param logError - If `true`, logs errors to the console.
 * @returns `true` if the deletion request was added successfully, otherwise `false`.
 */
export function deleteCookie(res: Response, name: string, options: CookieOptions = {}, logError = false): boolean {
  return setCookie(res, name, "", { ...options, maxAge: 0, expires: UNIX_EPOCH }, logError);
}
