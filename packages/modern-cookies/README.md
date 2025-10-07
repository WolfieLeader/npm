<div align="center">
<img src="https://github.com/WolfieLeader/npm/blob/main/assets/modern-cookies-banner.svg" align="center" alt="banner" />

<h1 align="center" style="font-weight:900;">modern-cookies</h1>

<p align="center">
  A Lightweight and Modern Cookie<br/>
  Utility for Express and Nest.js
</p>

<a href="https://opensource.org/licenses/MIT" rel="nofollow"><img src="https://img.shields.io/github/license/WolfieLeader/npm?color=DC343B" alt="License"></a>
<a href="https://www.npmjs.com/package/modern-cookies" rel="nofollow"><img src="https://img.shields.io/npm/v/modern-cookies?color=0078D4" alt="npm version"></a>
<a href="https://www.npmjs.com/package/modern-cookies" rel="nofollow"><img src="https://img.shields.io/npm/dt/modern-cookies.svg?color=03C03C" alt="npm downloads"></a>
<a href="https://github.com/WolfieLeader/npm" rel="nofollow"><img src="https://img.shields.io/github/stars/WolfieLeader/npm" alt="stars"></a>

</div>

## Why `modern-cookies`? 🤔

- 💡 **Simple API** — Intuitive functions `setCookie`, `getCookie`, and `deleteCookie` for effortless cookie management.
- 🔨 **Built on Reliability** — Uses the proven [cookie](https://www.npmjs.com/package/cookie) library for RFC-compliant parsing and serialization.
- ❌ **Graceful Error Handling** — Returns `false` on failures and provides a `logError` flag for optional console logging.
- 🛡️ **Security-Aware Defaults** — Automatically enforces rules for special prefixes: `__Secure-` and `__Host-`.

## Installation 🔥

```bash
npm install modern-cookies@latest
# or
yarn add modern-cookies@latest
# or
pnpm install modern-cookies@latest
# or
bun add modern-cookies@latest
```

## Usage 🪛

### Express 📫

```typescript
import express from "express";
import { getCookie, setCookie, deleteCookie } from "modern-cookies";
import { env } from "./env";

function bootstrap() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/get-cookie", (req, res) => {
    const cookieValue = getCookie(req, "myCookie");
    res.json({ cookieValue });
  });

  app.get("/set-cookie", (req, res) => {
    const isSet = setCookie(res, "myCookie", "SomeValue123", {
      httpOnly: true,
      maxAge: 60, // 1 minute
    });

    res.json({ message: isSet ? "Cookie set successfully" : "Failed to set cookie" });
  });

  app.get("/delete-cookie", (req, res) => {
    const isDeleted = deleteCookie(res, "myCookie");
    res.json({ message: isDeleted ? "Cookie deleted successfully" : "Failed to delete cookie" });
  });

  app.listen(env.PORT || 3000, () => {
    console.log(`🚀 Express server running on: http://localhost:${env.PORT || 3000}`);
  });
}

bootstrap();
```

### NestJS 🪺

```typescript
import { Controller, Get, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { getCookie, setCookie, deleteCookie } from "modern-cookies";

@Controller("")
export class PublicController {
  @Get("get-cookie")
  getCookie(@Req() req: Request) {
    const cookieValue = getCookie(req, "myCookie");
    return { cookieValue };
  }

  @Get("set-cookie")
  setCookie(@Res() res: Response) {
    const isSet = setCookie(res, "myCookie", "SomeValue123", {
      httpOnly: true,
      maxAge: 60, // 1 minute
    });
    // Since we used the `Res` we need to send the response manually
    res.json({ message: isSet ? "Cookie set successfully" : "Failed to set cookie" });
  }

  @Get("delete-cookie")
  deleteCookie(@Res() res: Response) {
    const isDeleted = deleteCookie(res, "myCookie");
    res.json({ message: isDeleted ? "Cookie deleted successfully" : "Failed to delete cookie" });
  }
}
```

## Credit 💪🏽

Huge credit to [Cookie NPM package](https://www.npmjs.com/package/cookie) for the cookie parsing and serialization used in this package.

## Contributions 🤝

Want to contribute or suggest a feature or improvement?

- Open an issue or feature request
- Submit a PR to improve the packages or add new ones
- Star ⭐ the repo if you like what you see

<div align="center">
<br/>
<div style="font-size: 14px; font-weight:bold;"> ⚒️ Crafted carefully by <a href="https://github.com/WolfieLeader" target="_blank" rel="nofollow">WolfieLeader</a></div>
<p style="font-size: 12px; font-style: italic;">This project is licensed under the <a href="https://opensource.org/licenses/MIT" target="_blank" rel="nofollow">MIT License</a>.</p>
<div style="font-size: 12px; font-style: italic; font-weight: 600;">Thank you!</div>
</div>
