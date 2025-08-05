<div align="center">
<img src="https://github.com/WolfieLeader/npm/blob/main/assets/modern-cookies-banner.svg" align="center" alt="banner" />

<h1 align="center" style="font-weight:900;">modern-cookies</h1>

<p align="center">
  A Lightweight and Modern Cookie<br/>
  Utility for Express and Nest.js
</p>

<a href="https://opensource.org/licenses/MIT" rel="nofollow"><img src="https://img.shields.io/github/license/WolfieLeader/npm?color=DC343B" alt="License"></a>
<a href="https://www.npmjs.com/package/modern-cookies" rel="nofollow"><img src="https://img.shields.io/npm/v/modern-cookies?color=0078D4" alt="npm version"></a>
<a href="https://www.npmjs.com/package/modern-cookies" rel="nofollow"><img src="https://img.shields.io/npm/dy/modern-cookies.svg?color=03C03C" alt="npm downloads"></a>
<a href="https://github.com/WolfieLeader/npm" rel="nofollow"><img src="https://img.shields.io/github/stars/WolfieLeader/npm" alt="stars"></a>

</div>

## About 📖

`modern-cookies` is a simple, type-safe, and secure cookie management utility for Express and Nest.js applications.  
It provides a minimal API for setting, getting, and deleting cookies — with security best practices built in.

## Features 🌟

- 💡 **Simple API** — Intuitive functions `setCookie`, `getCookie`, and `deleteCookie` for effortless cookie management.
- 🔨 **Built on Reliability** — Uses the proven [cookie](https://www.npmjs.com/package/cookie) library for RFC-compliant parsing and serialization.
- ❌ **Graceful Error Handling** — Returns `false` on failures and provides a `logError` flag for optional console logging.
- 🛡️ **Security-Aware Defaults** — Automatically enforces rules for special prefixes: `__Secure-` and `__Host-`.
- ⚙️ **Type-Safe & Cross-Compatible** — Fully written in TypeScript with complete type definitions. Works in both ESM and CommonJS runtimes.

## Installation 🔥

```bash
npm install modern-cookies
```

> 💡 Works with `npm`, `pnpm`, and `yarn`. You can use it in dev dependencies since it's typically used only for local HTTPS.

## Usage 🪛

### Express 📫

```typescript
import express from 'express';
import { getCookie, setCookie, deleteCookie } from 'modern-cookies';
import { env } from './env';

function bootstrap() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/get-cookie', (req, res) => {
    const cookieValue = getCookie(req, 'myCookie');
    res.json({ cookieValue });
  });

  app.get('/set-cookie', (req, res) => {
    const isSet = setCookie(res, 'myCookie', 'SomeValue123', {
      httpOnly: true,
      maxAge: 60, // 1 minute
    });

    res.json({ message: isSet ? 'Cookie set successfully' : 'Failed to set cookie' });
  });

  app.get('/delete-cookie', (req, res) => {
    const isDeleted = deleteCookie(res, 'myCookie');
    res.json({ message: isDeleted ? 'Cookie deleted successfully' : 'Failed to delete cookie' });
  });

  app.listen(env.PORT || 3000, () => {
    console.log(`🚀 Express server running on: http://localhost:${env.PORT || 3000}`);
  });
}

bootstrap();
```

### NestJS 🪺

```typescript
import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { getCookie, setCookie, deleteCookie } from 'modern-cookies';

@Controller('')
export class PublicController {
  @Get('get-cookie')
  getCookie(@Req() req: Request) {
    const cookieValue = getCookie(req, 'myCookie');
    return { cookieValue };
  }

  @Get('set-cookie')
  setCookie(@Res() res: Response) {
    const isSet = setCookie(res, 'myCookie', 'SomeValue123', {
      httpOnly: true,
      maxAge: 60, // 1 minute
    });
    // Since we used the `Res` we need to send the response manually
    res.json({ message: isSet ? 'Cookie set successfully' : 'Failed to set cookie' });
  }

  @Get('delete-cookie')
  deleteCookie(@Res() res: Response) {
    const isDeleted = deleteCookie(res, 'myCookie');
    res.json({ message: isDeleted ? 'Cookie deleted successfully' : 'Failed to delete cookie' });
  }
}
```

## Credit 💪🏽

We want to thank [Cookie NPM package](https://www.npmjs.com/package/cookie) for the cookie parsing and serialization used in this package.

## Contributions 🤝

Want to contribute or suggest a feature?

- Open an issue or feature request
- Submit a PR to improve the packages or add new ones
- Star ⭐ the repo if you like what you see

## License 📜

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

Thank you!
