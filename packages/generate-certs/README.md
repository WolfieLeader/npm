<div align="center">
<img src="https://github.com/WolfieLeader/npm/blob/main/assets/generate-certs-banner.svg" align="center" alt="banner" />

<h1 align="center">generate-certs</h1>

<p align="center">
  Self-signed HTTPS certificates for local development.<br/>
  Auto-generates, validates, and reuses.
</p>

<a href="https://opensource.org/licenses/MIT" rel="nofollow"><img src="https://img.shields.io/github/license/WolfieLeader/npm?color=DC343B" alt="License"></a>
<a href="https://www.npmjs.com/package/generate-certs" rel="nofollow"><img src="https://img.shields.io/npm/v/generate-certs?color=0078D4" alt="npm version"></a>
<a href="https://www.npmjs.com/package/generate-certs" rel="nofollow"><img src="https://img.shields.io/npm/dt/generate-certs.svg?color=03C03C" alt="npm downloads"></a>
<a href="https://github.com/WolfieLeader/npm" rel="nofollow"><img src="https://img.shields.io/github/stars/WolfieLeader/npm" alt="stars"></a>

</div>

> **Not for production.** These are self-signed certificates for local development only. For production, use a trusted CA like [Let's Encrypt](https://letsencrypt.org/).

## Highlights ✨

- **Automatic certificate generation** — no OpenSSL needed
- **Intelligent reuse** — validates expiry, permissions, and key/cert pairing
- **Pre-configured for localhost** — `127.0.0.1`, `::1`, and `localhost` SANs
- **Framework-ready** — Express, NestJS, Hono, Fastify
- **Secure file permissions** enforced (Unix: `600` on private key)

## Installation 📦

Requires Node.js >= 18. Recommended as a dev dependency.

```bash
npm install -D generate-certs
# or
pnpm add -D generate-certs
```

## Quick Start 🚀

```typescript
import path from "node:path";
import https from "node:https";
import express from "express";
import { generateCerts } from "generate-certs";

const certs = generateCerts({ certsPath: path.resolve(import.meta.dirname, "../certs") });

const app = express();
https.createServer(certs, app).listen(3443);
```

## API Reference 📖

### `generateCerts(options): { key: string; cert: string }`

Generates or retrieves self-signed certificates from the specified directory. If valid certificates already exist, they are reused. Returns `{ key: string; cert: string }` as PEM-formatted strings, ready for `https.createServer()`.

```typescript
import path from "node:path";
import { generateCerts } from "generate-certs";

// Auto-generates key.pem and cert.pem (or reuses valid existing ones)
const certs = generateCerts({ certsPath: path.resolve(import.meta.dirname, "../certs") });
console.log(certs.key); // "-----BEGIN RSA PRIVATE KEY-----\n..."
console.log(certs.cert); // "-----BEGIN CERTIFICATE-----\n..."

// Suppress console logs in CI/test environments
const silent = generateCerts({
  certsPath: path.resolve(import.meta.dirname, "../certs"),
  activateLogs: false,
});
```

**Options:** `certsPath` (required, absolute path to certificates directory), `activateLogs` (default `true`).

**Throws** if the path is invalid, inaccessible, or certificate generation fails.

## Certificate Details 📜

| Property                | Value                           |
| ----------------------- | ------------------------------- |
| Key algorithm           | RSA 2048-bit                    |
| Signature               | SHA-256                         |
| Validity                | 1 year from generation          |
| Common Name             | `localhost`                     |
| Subject Alt Names       | `localhost`, `127.0.0.1`, `::1` |
| Private key permissions | `600` (Unix only)               |

## Smart Reuse ♻️

When certificates already exist at the specified path, the following checks are performed before reusing them:

1. **File existence** — both `key.pem` and `cert.pem` must be present
2. **Permissions** — private key must have `600` permissions (Unix only, skipped on Windows)
3. **Expiry** — certificate must not be expired or expiring within 5 minutes
4. **Not-before** — certificate must already be valid (not issued for the future)
5. **Common Name** — must be `localhost`
6. **SANs** — must include `localhost`, `127.0.0.1`, and `::1`
7. **Key size** — RSA key must be at least 2048-bit
8. **Key/cert pairing** — the private key must match the certificate's public key

If any check fails, certificates are automatically regenerated.

## Framework Examples 🧩

### NestJS

```typescript
import path from "node:path";
import { NestFactory } from "@nestjs/core";
import { generateCerts } from "generate-certs";
import { AppModule } from "./app.module";

const certs = generateCerts({ certsPath: path.resolve(import.meta.dirname, "../certs") });

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { httpsOptions: certs });
  await app.listen(3443);
}

bootstrap();
```

### HonoJS

```typescript
import { createSecureServer } from "node:http2";
import path from "node:path";
import { serve } from "@hono/node-server";
import { generateCerts } from "generate-certs";
import { Hono } from "hono";

const certs = generateCerts({ certsPath: path.resolve(import.meta.dirname, "../certs") });

const app = new Hono();

serve({
  fetch: app.fetch,
  port: 3443,
  createServer: createSecureServer,
  serverOptions: certs,
});
```

### Fastify

```typescript
import path from "node:path";
import Fastify from "fastify";
import { generateCerts } from "generate-certs";

const certs = generateCerts({ certsPath: path.resolve(import.meta.dirname, "../certs") });

async function bootstrap() {
  const app = Fastify({ https: certs });
  await app.listen({ port: 3443, host: "0.0.0.0" });
}

bootstrap();
```

## Best Practices ✅

- **Add `certs/` to `.gitignore`** — never commit generated certificates to version control
- **Install as a dev dependency** (`-D`) — this package is not needed in production
- **Browser warnings are expected** — self-signed certificates will show "Not Secure"; click Advanced → Proceed to localhost
- **Suppress logs** with `activateLogs: false` when running in CI or test environments

## Type Exports 🏷️

```typescript
import type { GenerateCertsOptions } from "generate-certs";
```

## Credits 🙏

Built on [node-forge](https://www.npmjs.com/package/node-forge) for RSA key generation and X.509 certificate creation.

## Contributions 🤝

- Open an [issue](https://github.com/WolfieLeader/npm/issues) or feature request
- Submit a PR to improve the package
- Star the repo if you find it useful

<div align="center">
<br/>

Crafted carefully by [WolfieLeader](https://github.com/WolfieLeader)

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

</div>
