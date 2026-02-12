<div align="center">
<img src="https://github.com/WolfieLeader/npm/blob/main/assets/modern-cookies-banner.svg" align="center" alt="banner" />

<h1 align="center">modern-cookies</h1>

<p align="center">
  Type-safe cookie management for Express and NestJS<br/>
  with automatic security enforcement.
</p>

<a href="https://opensource.org/licenses/MIT" rel="nofollow"><img src="https://img.shields.io/github/license/WolfieLeader/npm?color=DC343B" alt="License"></a>
<a href="https://www.npmjs.com/package/modern-cookies" rel="nofollow"><img src="https://img.shields.io/npm/v/modern-cookies?color=0078D4" alt="npm version"></a>
<a href="https://www.npmjs.com/package/modern-cookies" rel="nofollow"><img src="https://img.shields.io/npm/dt/modern-cookies.svg?color=03C03C" alt="npm downloads"></a>
<a href="https://github.com/WolfieLeader/npm" rel="nofollow"><img src="https://img.shields.io/github/stars/WolfieLeader/npm" alt="stars"></a>

</div>

## Highlights ✨

- **Simple API** — `setCookie`, `getCookie`, and `deleteCookie`
- **Automatic security enforcement** for `__Secure-` and `__Host-` cookie prefixes
- **`sameSite: "none"` enforcement** — automatically forces `secure: true`
- **Graceful error handling** — returns `boolean`, never throws
- **Built on** the RFC-compliant [`cookie`](https://www.npmjs.com/package/cookie) library

## Installation 📦

Requires Node.js >= 20. Express is an optional peer dependency.

```bash
npm install modern-cookies
# or
pnpm add modern-cookies
```

## Quick Start 🚀

```typescript
import express from "express";
import { getCookie, setCookie, deleteCookie } from "modern-cookies";

const app = express();

app.post("/login", (req, res) => {
  setCookie(res, "session", "abc123", { httpOnly: true, secure: true, sameSite: "lax", maxAge: 86400 });
  res.json({ message: "Logged in" });
});

app.get("/profile", (req, res) => {
  const session = getCookie(req, "session");
  res.json({ session });
});

app.post("/logout", (req, res) => {
  deleteCookie(res, "session");
  res.json({ message: "Logged out" });
});

app.listen(3000);
```

## API Reference 📖

### `getCookie(req, name, logError?): string | undefined`

Retrieves a cookie value from the request's `Cookie` header. Returns `undefined` if not found.

```typescript
const session = getCookie(req, "session");

// Enable error logging for debugging
const theme = getCookie(req, "theme", true);
```

### `setCookie(res, name, value, options, logError?): boolean`

Sets a cookie on the response. The `options` parameter is **required**. Returns `true` on success, `false` on failure.

```typescript
setCookie(res, "theme", "dark", { maxAge: 60 * 60 * 24 * 365, sameSite: "strict" });

// Check if the cookie was set successfully
const ok = setCookie(res, "lang", "en", { maxAge: 60 * 60 * 24 * 365 });
```

> **Tip:** For session or auth cookies, always set `{ httpOnly: true, secure: true, sameSite: "lax" }` to mitigate XSS and CSRF risks.

### `deleteCookie(res, name, options?, logError?): boolean`

Deletes a cookie by setting `maxAge: 0`. If the cookie was set with a specific `path` or `domain`, pass the same values to ensure the correct cookie is removed.

```typescript
deleteCookie(res, "session");

// If the cookie was set with a specific path/domain, match them
deleteCookie(res, "tracking", { path: "/app", domain: "example.com" });
```

### `CookieOptions`

```typescript
interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none";
  maxAge?: number; // Lifetime in seconds; omit for session cookie
  expires?: Date; // Exact expiration date (Expires attribute)
  path?: string; // URL path scope (default: "/")
  domain?: string; // Domain scope; omit to restrict to current host
  priority?: "low" | "medium" | "high";
}
```

> **Type export:** `import type { CookieOptions } from "modern-cookies"`

## Security Features 🛡️

### Cookie Prefix Enforcement

When you use special cookie name prefixes, `setCookie` automatically enforces the required attributes:

| Prefix      | Enforced Attributes                           |
| ----------- | --------------------------------------------- |
| `__Secure-` | `secure: true`                                |
| `__Host-`   | `secure: true`, `path: "/"`, `domain` removed |

```typescript
// secure is automatically forced to true
setCookie(res, "__Secure-Token", value, { httpOnly: true });

// secure, path, and domain are all enforced
setCookie(res, "__Host-Token", value, { httpOnly: true });
```

### `sameSite: "none"` Enforcement

When `sameSite` is set to `"none"`, `secure: true` is automatically added. This prevents browsers from silently rejecting the cookie.

```typescript
// secure: true is added automatically
setCookie(res, "cross-origin", value, { sameSite: "none" });
```

### Safe Error Logging

When `logError` is enabled, error messages include only the cookie **name** and the error reason — never the cookie **value**. All logged strings are sanitized (newlines and control characters are stripped, length is capped) to prevent log injection.

## NestJS 🧩

```typescript
import { Controller, Get, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { getCookie, setCookie, deleteCookie } from "modern-cookies";

@Controller("auth")
export class AuthController {
  @Post("login")
  login(@Res() res: Response) {
    const token = "generated-session-token";
    setCookie(res, "session", token, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 60 * 60 * 24 });
    res.json({ success: true });
  }

  @Get("me")
  me(@Req() req: Request, @Res() res: Response) {
    const session = getCookie(req, "session");
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    res.json({ session });
  }

  @Post("logout")
  logout(@Res() res: Response) {
    deleteCookie(res, "session");
    res.json({ success: true });
  }
}
```

## Credits 🙏

Built on the [cookie](https://www.npmjs.com/package/cookie) package for RFC-compliant parsing and serialization.

## Contributions 🤝

- Open an [issue](https://github.com/WolfieLeader/npm/issues) or feature request
- Submit a PR to improve the package
- Star the repo if you find it useful

<div align="center">
<br/>

Crafted carefully by [WolfieLeader](https://github.com/WolfieLeader)

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

</div>
