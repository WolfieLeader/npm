import type { CookieOptions, deleteCookie, getCookie, setCookie } from "modern-cookies";

const _cookieOpts: CookieOptions = { httpOnly: true, secure: true, sameSite: "strict" };
const _getCookie: typeof getCookie = {} as typeof getCookie;
const _setCookie: typeof setCookie = {} as typeof setCookie;
const _deleteCookie: typeof deleteCookie = {} as typeof deleteCookie;
