import { parse, serialize } from 'cookie';
import type { Request, Response } from 'express';

export interface CookieOptions {
  /** Specifies the `HttpOnly` attribute for the cookie. */
  httpOnly?: boolean;
  /** Specifies the `Secure` attribute for the cookie. */
  secure?: boolean;
  /** Specifies the `SameSite` attribute for the cookie. */
  sameSite?: 'strict' | 'lax' | 'none';
  /** Specifies the `number` (in seconds) the cookie will be valid for */
  maxAge?: number;
  /** Specifies the `Expires` attribute for the cookie. */
  expires?: Date;
  /** Specifies the `Path` attribute for the cookie. */
  path?: string;
  /** Specifies the `Domain` attribute for the cookie. */
  domain?: string;
  /** Specifies the `Priority` attribute for the cookie. */
  priority?: 'low' | 'medium' | 'high';
}

export function getCookie(req: Request, name: string, logError = false): string | undefined {
  try {
    const header = req.get('cookie');
    if (!header) return undefined;
    const cookies = parse(header);
    return cookies[name];
  } catch (error) {
    if (logError) console.error(`Error getting cookie "${name}":`, error);
    return undefined;
  }
}

export function setCookie(
  res: Response,
  name: string,
  value: string,
  options: CookieOptions,
  logError = false,
): boolean {
  try {
    let cookieOptions = { ...options, path: options.path || '/' };

    if (name.startsWith('__Secure-')) {
      cookieOptions = { ...cookieOptions, secure: true };
    } else if (name.startsWith('__Host-')) {
      cookieOptions = { ...cookieOptions, secure: true, domain: undefined };
    }

    const serialized = serialize(name, value, cookieOptions);
    res.append('Set-Cookie', serialized);
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

export function deleteCookie(res: Response, name: string, options: CookieOptions, logError = false): boolean {
  return setCookie(res, name, '', { ...options, maxAge: 0 }, logError);
}
