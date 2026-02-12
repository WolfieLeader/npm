<div align="center">
<img src="https://github.com/WolfieLeader/npm/blob/main/assets/get-client-ip-banner.svg" align="center" alt="banner" />

<h1 align="center">get-client-ip</h1>

<p align="center">
  Extract the real client IP from HTTP requests.<br/>
  Works standalone or as Express/NestJS middleware.
</p>

<a href="https://opensource.org/licenses/MIT" rel="nofollow"><img src="https://img.shields.io/github/license/WolfieLeader/npm?color=DC343B" alt="License"></a>
<a href="https://www.npmjs.com/package/get-client-ip" rel="nofollow"><img src="https://img.shields.io/npm/v/get-client-ip?color=0078D4" alt="npm version"></a>
<a href="https://www.npmjs.com/package/get-client-ip" rel="nofollow"><img src="https://img.shields.io/npm/dt/get-client-ip.svg?color=03C03C" alt="npm downloads"></a>
<a href="https://github.com/WolfieLeader/npm" rel="nofollow"><img src="https://img.shields.io/github/stars/WolfieLeader/npm" alt="stars"></a>

</div>

## Highlights ✨

- **Checks 12+ proxy headers** in priority order
- **Handles** comma-separated, array, and RFC 7239 `Forwarded` formats
- **Works standalone** or as Express/NestJS middleware
- **Auto-populates** `req.clientIp` and `req.clientIps` with full TypeScript support
- **Zero config** — validates IPs using Node.js `net.isIP()`

## Installation 📦

Requires Node.js >= 20. Express is an optional peer dependency.

```bash
npm install get-client-ip
# or
pnpm add get-client-ip
```

## Quick Start 🚀

```typescript
import express from "express";
import { getClientIp } from "get-client-ip";

const app = express();

// Middleware — auto-populates req.clientIp and req.clientIps
app.use(getClientIp);

app.get("/me", (req, res) => {
  res.json({ ip: req.clientIp, ips: req.clientIps });
});

// Or standalone — call directly in a specific route
app.get("/ip", (req, res) => {
  const ip = getClientIp(req);
  res.json({ ip });
});

app.listen(3000);
```

## API Reference 📖

### `getClientIp(req, res?, next?): string | undefined`

Extracts the client's IP address from an incoming request. Works both as a standalone function and as Express middleware. Returns `string | undefined`.

```typescript
import { getClientIp } from "get-client-ip";

// Standalone — returns the IP directly
app.get("/ip", (req, res) => {
  const ip = getClientIp(req); // "203.0.113.50" or undefined
  res.json({ ip });
});

// Middleware — same function, but also calls next() and populates req.clientIp
app.use(getClientIp);

app.get("/me", (req, res) => {
  // req.clientIp  — first valid IP (string | undefined)
  // req.clientIps — all valid IPs ([string, ...string[]] | undefined)
  res.json({ ip: req.clientIp, allIps: req.clientIps });
});
```

**Side effects:** Sets `req.clientIp` and `req.clientIps` on the request object when a valid IP is found. Throws if `req` is `undefined`.

### TypeScript Augmentation

The package augments the Express `Request` type automatically:

```typescript
// These properties are available after calling getClientIp
req.clientIp; // string | undefined — first valid IP
req.clientIps; // [string, ...string[]] | undefined — all valid IPs (non-empty array)
```

No manual type declarations are needed.

## Header Priority 📋

Sources are checked in the following order. The first valid IP found is returned.

| Priority | Source                     | Description                            |
| -------- | -------------------------- | -------------------------------------- |
| 1        | `req.ip`                   | Express `trust proxy` setting          |
| 2        | `Forwarded`                | RFC 7239 (parsed for `for=` directive) |
| 3        | `CF-Connecting-IP`         | Cloudflare                             |
| 4        | `True-Client-IP`           | Akamai / Cloudflare Enterprise         |
| 5        | `Fastly-Client-IP`         | Fastly CDN                             |
| 6        | `X-Appengine-User-IP`      | Google App Engine                      |
| 7        | `CF-Pseudo-IPv4`           | Cloudflare pseudo-IPv4                 |
| 8        | `X-Client-IP`              | General proxy header                   |
| 9        | `X-Forwarded-For`          | De facto standard proxy header         |
| 10       | `Forwarded-For`            | Variant of X-Forwarded-For             |
| 11       | `X-Forwarded`              | Microsoft variant                      |
| 12       | `X-Real-IP`                | Nginx proxy header                     |
| 13       | `X-Cluster-Client-IP`      | Rackspace / Riverbed                   |
| 14       | `req.socket.remoteAddress` | Direct connection fallback             |

## NestJS 🧩

```typescript
import { Controller, Get, Req } from "@nestjs/common";
import type { Request } from "express";
import { getClientIp } from "get-client-ip";

@Controller()
export class AppController {
  @Get("ip")
  getIp(@Req() req: Request) {
    const ip = getClientIp(req);
    return { ip };
  }
}
```

## Security 🛡️

> **Header trust warning:** When `req.ip` is not populated, forwarding headers are used only when `req.socket.remoteAddress` appears to be from a local/private proxy range. Public socket peers skip header fallback to reduce spoofing risk.

**In production behind a reverse proxy:**

1. Configure Express's [`trust proxy`](https://expressjs.com/en/guide/behind-proxies.html) setting so that `req.ip` is correctly populated
2. This ensures the function returns `req.ip` first and avoids fallback ambiguity
3. Without `trust proxy`, forwarding headers may still be ignored when the peer is public

## Credits 🙏

Inspired by [Petar Bojinov's](https://github.com/pbojinov) work on client IP detection.

## Contributions 🤝

- Open an [issue](https://github.com/WolfieLeader/npm/issues) or feature request
- Submit a PR to improve the package
- Star the repo if you find it useful

<div align="center">
<br/>

Crafted carefully by [WolfieLeader](https://github.com/WolfieLeader)

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

</div>
