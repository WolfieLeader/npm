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
