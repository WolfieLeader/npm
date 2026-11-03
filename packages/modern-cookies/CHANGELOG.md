# Changelog

## 3.1.0

- Bundles `cookie`, so there are no runtime dependencies and the CommonJS build no longer needs `require(esm)`.
- Supports Node.js 20 and later, and is tested on Bun and Deno 2.

## 3.0.0

Breaking changes:

- **Requires Node.js >= 22.12.** The `cookie` dependency is now v2, which is ESM-only. The CommonJS build loads it through `require(esm)`.
- **`logError` is replaced by a `logger` option.** The positional boolean is gone from `getCookie`, `setCookie`, and `deleteCookie`. Pass `{ logger: console.error }` in the options object instead: `getCookie(req, name, { logger })`, `setCookie(res, name, value, { ...attributes, logger })`. Without a `logger`, nothing is logged. The logger gets one string: `Error setting cookie "<name>": <reason>`.
- **Values are percent-encoded only where needed.** cookie v2 leaves characters that are legal in a cookie value as-is, so `setCookie(res, "t", "ab+/c==")` writes `t=ab+/c==` where v2 wrote `t=ab%2B%2Fc%3D%3D`. `getCookie` reads both. A reader that form-decodes cookies turns `+` into a space, so give it encoded values yourself.
- **Cookie prefixes match case-insensitively.** `__host-`, `__HOST-`, `__secure-`, and other spellings now get the `__Host-` and `__Secure-` rules. Browsers reject such cookies without those attributes, so v2 produced cookies browsers dropped.

## 2.0.0

Breaking changes:

- **Requires Node.js >= 18.** Earlier versions declared no `engines`.
- **`__Host-` cookies always get `Path=/`.** 1.x kept a custom `path`.
- **`sameSite: "none"` forces `secure: true`.**
- **An invalid `sameSite` fails.** `setCookie` returns `false`. `"Strict"`, `"Lax"`, and `"None"` are accepted as well as the lowercase values.
- **`logError` output changed.** Logs carry only the cookie name and the reason, with control characters stripped. 1.x also logged the cookie value and options.

Other changes:

- Works with any request that has `get(name)` and any response that has `append(field, value)`, such as Express 4 and 5. The `express` peer dependency is gone. Exports the `CookieRequest` and `CookieResponse` types.
- `deleteCookie` makes `options` optional and also sets `Expires` to the Unix epoch.

## 1.0.0

- `setCookie` and `deleteCookie` return `true` or `false` instead of throwing. `getCookie` returns `undefined` when parsing fails.
- Each function takes an optional `logError` flag that logs failures with `console.error`.
- `CookieOptions` gains `expires`.

## 0.0.1

- First release: `getCookie`, `setCookie`, and `deleteCookie` for Express, built on `cookie`. `__Secure-` cookies get `Secure`. `__Host-` cookies get `Secure` and lose `Domain`.
