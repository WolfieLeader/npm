import { parseCookie, stringifySetCookie } from "cookie";

/** Minimal request interface — any object with a `get` method (Express v4, v5, etc.). */
export interface CookieRequest {
  get: (name: string) => string | undefined;
}

/** Minimal response interface — any object with an `append` method (Express v4, v5, etc.). */
export interface CookieResponse {
  append: (field: string, value: string | string[]) => unknown;
}

/** Reports whether `char` is an ASCII control character (U+0000 to U+001F, or U+007F). */
function $isControlChar(char: string): boolean {
  return char < " " || char === "\u007F";
}

function $sanitizeForLog(input: unknown, maxLength = 160): string {
  let value = String(input);
  if (typeof input === "string") value = input;
  else if (input instanceof Error) value = input.message;
  // Replace every ASCII control character with a space, so one error is one log line.
  return Array.from(value, (char) => ($isControlChar(char) ? " " : char))
    .join("")
    .slice(0, maxLength);
}

/** Receives one sanitized line per error. Same shape as `generate-certs`' `logger`. */
export type CookieLogger = (message: string) => void;

/** Reads `logger` from options that JS callers may pass as `null` or `undefined`. */
function $loggerOf(options: { logger?: CookieLogger | undefined } | null | undefined): CookieLogger | undefined {
  return options?.logger;
}

function $safeLogCookieError(
  logger: CookieLogger | undefined,
  { action, name, error }: { action: "getting" | "setting"; name: string; error: unknown },
): void {
  if (!logger) return;
  try {
    logger(`Error ${action} cookie "${$sanitizeForLog(name)}": ${$sanitizeForLog(error)}`);
  } catch {
    // A throwing logger must not turn a cookie error into a request failure.
  }
}

/** Matches cookie name prefixes case-insensitively, as user agents must (RFC 6265bis §5.4). */
function $cookiePrefix(name: string): "host" | "secure" | undefined {
  const lower = name.slice(0, 9).toLowerCase();
  if (lower.startsWith("__host-")) return "host";
  if (lower.startsWith("__secure-")) return "secure";
  return undefined;
}

function $normalizeSameSite(value: CookieOptions["sameSite"]): "strict" | "lax" | "none" | undefined {
  if (value === undefined) return undefined;

  const normalized = value.toLowerCase();
  if (normalized === "strict" || normalized === "lax" || normalized === "none") return normalized;
  throw new Error(`Invalid sameSite value: ${value}`);
}

/** Options for setting a cookie. */
export interface CookieOptions {
  /** Prevents client-side JavaScript access to the cookie value. */
  httpOnly?: boolean;
  /** Sends cookie only over HTTPS; required for `__Secure-` and `__Host-` prefixes. */
  secure?: boolean;
  /** Cross-site behavior; `'none'` should be paired with `secure: true`. */
  sameSite?: "strict" | "lax" | "none" | "Strict" | "Lax" | "None";
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
  /** Receives serialization errors (cookie name and reason only, never the value). Silent when omitted. */
  logger?: CookieLogger;
}

/** Options for reading a cookie. */
export interface GetCookieOptions {
  /** Receives parsing errors (cookie name and reason only). Silent when omitted. */
  logger?: CookieLogger;
}

/**
 * Retrieves the value of a cookie from an Express request.
 *
 * @param req - The Express request object.
 * @param name - The name of the cookie to retrieve.
 * @param options - `logger` receives parsing errors. Silent when omitted.
 * @returns The cookie value if found, otherwise `undefined`.
 */
export function getCookie(req: CookieRequest, name: string, options: GetCookieOptions = {}): string | undefined {
  try {
    const header = req.get("cookie");
    if (header === undefined || header === "") return undefined;

    const cookies = parseCookie(header);
    return cookies[name];
  } catch (error) {
    $safeLogCookieError($loggerOf(options), { action: "getting", name, error });
    return undefined;
  }
}

/**
 * Sets a cookie on an Express response.
 *
 * Path defaults to `"/"` when not specified.
 *
 * Automatically applies stricter defaults for special prefixes, matched case-insensitively like browsers do:
 * - `__Secure-`: Forces `secure: true`.
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
 * @param options - Configuration for the cookie's attributes. `logger` receives serialization errors.
 * @returns `true` if the cookie was set successfully, otherwise `false`.
 */
export function setCookie(res: CookieResponse, name: string, value: string, options: CookieOptions): boolean {
  const logger = $loggerOf(options);
  try {
    const { logger: _logger, sameSite: rawSameSite, ...attributes } = options;
    const sameSite = $normalizeSameSite(rawSameSite);
    const cookieOptions = {
      ...attributes,
      ...(sameSite === undefined ? {} : { sameSite }),
      path: attributes.path ?? "/",
    };
    const prefix = $cookiePrefix(name);
    if (prefix === "host") {
      cookieOptions.secure = true;
      cookieOptions.path = "/";
      delete cookieOptions.domain;
    } else if (prefix === "secure") {
      cookieOptions.secure = true;
    }

    if (cookieOptions.sameSite === "none") {
      cookieOptions.secure = true;
    }

    const serialized = stringifySetCookie({ ...cookieOptions, name, value });
    res.append("Set-Cookie", serialized);
    return true;
  } catch (error) {
    $safeLogCookieError(logger, { action: "setting", name, error });
    return false;
  }
}

const UNIX_EPOCH = new Date(0);

/**
 * Deletes a cookie by setting its `Max-Age` to `0` and `Expires` to the Unix epoch.
 *
 * @param res - The Express response object.
 * @param name - The name of the cookie to delete.
 * @param options - Additional options for deleting the cookie (e.g., `path`, `domain`, `logger`).
 * @returns `true` if the deletion request was added successfully, otherwise `false`.
 */
export function deleteCookie(res: CookieResponse, name: string, options: CookieOptions = {}): boolean {
  return setCookie(res, name, "", { ...options, maxAge: 0, expires: UNIX_EPOCH });
}
