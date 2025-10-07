<div align="center">
<img src="https://github.com/WolfieLeader/npm/blob/main/assets/get-client-ip-banner.svg" align="center" alt="banner" />

<h1 align="center" style="font-weight:900;">get-client-ip</h1>

<p align="center">
  A Lightweight Utility for Extracting <br/> 
  the Real Client IP Address from <br/> 
  Incoming HTTP Requests
</p>

<a href="https://opensource.org/licenses/MIT" rel="nofollow"><img src="https://img.shields.io/github/license/WolfieLeader/npm?color=DC343B" alt="License"></a>
<a href="https://www.npmjs.com/package/get-client-ip" rel="nofollow"><img src="https://img.shields.io/npm/v/get-client-ip?color=0078D4" alt="npm version"></a>
<a href="https://www.npmjs.com/package/get-client-ip" rel="nofollow"><img src="https://img.shields.io/npm/dt/get-client-ip.svg?color=03C03C" alt="npm downloads"></a>
<a href="https://github.com/WolfieLeader/npm" rel="nofollow"><img src="https://img.shields.io/github/stars/WolfieLeader/npm" alt="stars"></a>

</div>

## Why `get-client-ip`? 🤔

- 🌐 **Header-Aware Detection** – Parses standard and cloud-specific proxy headers.
- 🧠 **Smart Parsing** – Handles multiple IPs, comma-separated values, and arrays.
- 🧩 **Middleware-Compatible** – Use as drop-in Express/NestJS middleware.
- 💪🏽 **Works in Standalone Mode** – Can be used as a simple function.

## Installation 🔥

```bash
npm install get-client-ip@latest
# or
yarn add get-client-ip@latest
# or
pnpm install get-client-ip@latest
# or
bun add get-client-ip@latest
```

## Usage 🪛

### Express 📫

```typescript
import http from "node:http";
import express from "express";
import { getClientIp } from "get-client-ip";
import { env } from "./env";

function bootstrap() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Standalone usage:
  app.get("/standalone-ip", (req, res) => {
    const ip = getClientIp(req);
    res.status(200).json({ ip });
  });

  // Middleware usage:
  app.get("/middleware-ip", getClientIp, (req, res) => {
    res.status(200).json({ ip: req.clientIp, ips: req.clientIps });
  });

  http.createServer(app).listen(env.PORT || 3000, () => {
    console.log(`🚀 Express server running on: http://localhost:${env.PORT || 3000}`);
  });
}

bootstrap();
```

### NestJS 🪺

```typescript
import { Controller, Get, Req } from "@nestjs/common";
import type { Request } from "express";
import { getClientIp } from "get-client-ip";

@Controller("")
export class PublicController {
  @Get("ip")
  getIp(@Req() req: Request) {
    const ip = getClientIp(req);
    return { ip };
  }
}
```

## Headers ⛑️

The following headers are checked in order of precedence:

```typescript
x-client-ip
x-forwarded-for
forwarded-for
x-forwarded
forwarded
x-real-ip
cf-connecting-ip
true-client-ip
x-cluster-client-ip
fastly-client-ip
x-appengine-user-ip
cf-pseudo-ipv4
```

It also falls back to:

```typescript
req.ip;
req.socket.remoteAddress;
req.connection.remoteAddress;
```

## Credit 💪🏽

Huge credit to [Petar Bojinov](https://github.com/pbojinov) for the inspiration.

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
