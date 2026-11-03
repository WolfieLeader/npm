<div align="center">
<img src="https://github.com/WolfieLeader/npm/blob/main/assets/get-client-ip-banner.svg" align="center" alt="banner" />

<h1 align="center">get-client-ip</h1>

<p align="center">
  Extract the real client IP from HTTP requests, safely behind proxies.<br/>
  Works standalone or as Express/NestJS middleware.
</p>

<a href="https://opensource.org/licenses/MIT" rel="nofollow"><img src="https://img.shields.io/github/license/WolfieLeader/npm?color=DC343B" alt="License"></a>
<a href="https://www.npmjs.com/package/get-client-ip" rel="nofollow"><img src="https://img.shields.io/npm/v/get-client-ip?color=0078D4" alt="npm version"></a>
<a href="https://www.npmjs.com/package/get-client-ip" rel="nofollow"><img src="https://img.shields.io/npm/dt/get-client-ip.svg?color=03C03C" alt="npm downloads"></a>
<a href="https://github.com/WolfieLeader/npm" rel="nofollow"><img src="https://img.shields.io/github/stars/WolfieLeader/npm" alt="stars"></a>

</div>

## Highlights ✨

- **Spoof-resistant** — walks `X-Forwarded-For` from the right and stops at the first untrusted hop, like Express `trust proxy`
- **Works without a framework** — raw `node:http`, Koa `ctx.req`, Next.js pages API, Express v4/v5, Fastify, NestJS
- **Opt-in vendor headers** — `cf-connecting-ip`, `true-client-ip`, and similar are read only when you list them
- **RFC 7239 `Forwarded`** — quoted strings, IPv6, ports, `unknown`, and obfuscated identifiers
- **CIDR trust lists** — IPv4 and IPv6, compared as parsed addresses
- **Normalized output** — `::ffff:1.2.3.4` becomes `1.2.3.4`; IPv6 is lowercase and compressed

## Installation 📦

Requires Node.js >= 22.12.

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

// Middleware — populates req.clientIp and req.clientIps
app.use(getClientIp);

app.get("/me", (req, res) => {
  res.json({ ip: req.clientIp, ips: req.clientIps });
});

// Or standalone — call directly in a route
app.get("/ip", (req, res) => {
  res.json({ ip: getClientIp(req) });
});

app.listen(3000);
```

Without a framework:

```typescript
import http from "node:http";
import { getClientIp } from "get-client-ip";

http.createServer((req, res) => res.end(getClientIp(req))).listen(3000);
```

## API Reference 📖

### `getClientIp(req, options?): string | undefined`

Returns the client IP, or `undefined` when no address is known. Also sets `req.clientIp` and `req.clientIps`. Throws if `req` is missing or `options` are invalid.

Passing it straight to `app.use(getClientIp)` runs it as middleware with default options.

### `getClientIpMiddleware(options?)`

Returns `(req, res, next)` middleware that uses `options`. It validates `options` once, at creation.

```typescript
import { DEFAULT_TRUSTED_PROXIES, getClientIpMiddleware } from "get-client-ip";

app.use(getClientIpMiddleware({ trustedProxies: [...DEFAULT_TRUSTED_PROXIES, "203.0.113.0/24"] }));
```

### Options

| Option            | Type                               | Default                   | Description                                                                                   |
| ----------------- | ---------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------- |
| `trustedProxies`  | `string[]`                         | `DEFAULT_TRUSTED_PROXIES` | IPs or CIDRs of proxies whose forwarding headers you trust. `[]` trusts none.                 |
| `forwardedHeader` | `"x-forwarded-for" \| "forwarded"` | `"x-forwarded-for"`       | The header your proxies append to. The other one is ignored.                                  |
| `trustedHeaders`  | `string[]`                         | `[]`                      | Single-IP headers your edge always overwrites, e.g. `["cf-connecting-ip"]`. Checked in order. |

`DEFAULT_TRUSTED_PROXIES` is `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `::1/128`, `fc00::/7`, and `fe80::/10`. CGNAT (`100.64.0.0/10`) is not trusted.

### `req.clientIp` and `req.clientIps`

```typescript
req.clientIp; // string | undefined — the client IP
req.clientIps; // [string, ...string[]] | undefined — the client, then each trusted hop toward your server
```

The package augments the Express `Request` type, so no manual declarations are needed.

## How the IP Is Resolved 📋

1. **`trustedHeaders`** — the first valid IP from a listed header, only when the socket peer is a trusted proxy.
2. **`req.ip`** — when it is a valid IP outside `trustedProxies`. Express and Fastify set it from their own trust settings.
   - If `req.ip` is itself a trusted proxy (e.g. Express without `trust proxy` behind nginx), it is the proxy, not the client. The chain is walked as in step 4. `req.ip` is kept only when no untrusted hop is found.
3. **Socket address** — when the socket peer is not a trusted proxy, headers are ignored.
4. **Forwarding chain** — read `X-Forwarded-For` (or `Forwarded`) from the right. Skip each trusted proxy. Return the first untrusted address.
   - If every hop is trusted, return the leftmost one.
   - An `unknown`, obfuscated (`_hidden`), or invalid hop stops the walk. The nearest trusted hop is returned.

Example: nginx on `10.0.0.5` appends the peer it saw. A client sends `X-Forwarded-For: 6.6.6.6`, so your app receives `6.6.6.6, 203.0.113.9`. The result is `203.0.113.9`, not the spoofed `6.6.6.6`.

## Deployment Recipes 🧭

| Setup                                              | Configuration                                                                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| nginx, HAProxy, or a load balancer on a private IP | Defaults                                                                                                      |
| Express behind a proxy                             | Defaults work; setting Express [`trust proxy`](https://expressjs.com/en/guide/behind-proxies.html) also works |
| Cloudflare in front of a private load balancer     | `{ trustedHeaders: ["cf-connecting-ip"] }`                                                                    |
| Proxy that writes RFC 7239 `Forwarded`             | `{ forwardedHeader: "forwarded" }`                                                                            |
| Proxy on a public IP                               | `{ trustedProxies: [...DEFAULT_TRUSTED_PROXIES, "<proxy CIDR>"] }`                                            |
| Directly on the internet                           | `{ trustedProxies: [] }`                                                                                      |

## NestJS 🧩

```typescript
import { Controller, Get, Req } from "@nestjs/common";
import type { Request } from "express";
import { getClientIp } from "get-client-ip";

@Controller()
export class AppController {
  @Get("ip")
  getIp(@Req() req: Request) {
    return { ip: getClientIp(req) };
  }
}
```

## Security 🛡️

- **List only headers your edge overwrites.** A `trustedHeaders` entry is client-controlled unless every request passes through that edge. Make your origin reachable only through it.
- **Pick the header your proxy writes.** If your proxy appends `X-Forwarded-For`, a client-sent `Forwarded` header is ignored, and vice versa.
- **Clients inside a trusted range can spoof.** A host on a trusted network can send any `X-Forwarded-For`. Narrow `trustedProxies` to your proxies' addresses when that matters.
- **An untrusted `req.ip` is trusted as-is.** If your framework's proxy trust is looser than `trustedProxies`, `req.ip` can come from a client-supplied header.

## Breaking Changes in v5 ⚠️

- **Requires Node.js >= 22.12.**
- **`X-Forwarded-For` is read from the right.** v4 returned the leftmost entry, which any client can set. Now the first untrusted hop from the right is returned.
- **Vendor headers need opt-in.** `cf-connecting-ip`, `true-client-ip`, `fastly-client-ip`, `x-appengine-user-ip`, `cf-pseudo-ipv4`, `x-client-ip`, `x-real-ip`, `x-cluster-client-ip`, `forwarded-for`, and `x-forwarded` are ignored unless listed in `trustedHeaders`.
- **A trusted `req.ip` no longer wins.** When `req.ip` is inside `trustedProxies` (Express without `trust proxy` behind a private or loopback proxy), the forwarding chain is walked. v4 returned the proxy's address. Pass `trustedProxies: []` to keep the v4 result.
- **`Forwarded` needs opt-in.** Set `forwardedHeader: "forwarded"`. `X-Forwarded-For` is then ignored.
- **The second argument is now `options`.** `getClientIp(req, res)` no longer means middleware; use `getClientIp(req, res, next)`, `app.use(getClientIp)`, or `getClientIpMiddleware()`.
- **`req.clientIps` changed meaning.** It is the client followed by the trusted hops toward your server, ending with the socket peer. v4 listed every header entry.
- **Output is normalized.** IPv4-mapped IPv6 (`::ffff:1.2.3.4`) becomes IPv4, including `req.ip`. IPv6 is lowercase and compressed, and its zone ID is dropped (`fe80::1%eth0` becomes `fe80::1`).
- **A quoted `X-Forwarded-For` entry is an invalid hop.** v4 stripped the quotes from `"203.0.113.9"`. Proxies never quote it, so a quoted entry is client-written and stops the walk.
- **The middleware always sets `req.clientIp`.** It is `undefined` when no address resolves. v4 left the property untouched.
- **IPv6 trust uses real CIDR matching.** `fc::1` is no longer trusted (it is not in `fc00::/7`). `fe80::/10` now covers `fe80::`–`febf::`.
- **`0.0.0.0` and `::` are invalid hops.**

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
