import type { CookieOptions, CookieRequest, CookieResponse, deleteCookie, getCookie, setCookie } from "modern-cookies";

const _cookieOpts: CookieOptions = { httpOnly: true, secure: true, sameSite: "strict" };
const _getCookie: typeof getCookie = {} as typeof getCookie;
const _setCookie: typeof setCookie = {} as typeof setCookie;
const _deleteCookie: typeof deleteCookie = {} as typeof deleteCookie;
const _cookieReq: CookieRequest = {} as CookieRequest;
const _cookieRes: CookieResponse = {} as CookieResponse;
