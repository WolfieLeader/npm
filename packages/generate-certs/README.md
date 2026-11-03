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
- **No runtime dependencies** — Node's `crypto` makes and signs the key; a small DER encoder writes the certificate
- **Intelligent reuse** — validates expiry, permissions, and key/cert pairing
- **Pre-configured for localhost** — `127.0.0.1`, `::1`, and `localhost` SANs
- **Framework-ready** — Express, NestJS, Hono, Fastify
- **Secure file permissions** enforced (Unix: `600` on private key)

## Installation 📦

Requires Node.js >= 22.12. Recommended as a dev dependency.

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

// Print what happened (reuse, permission fix, backup, generation)
const logged = generateCerts({
  certsPath: path.resolve(import.meta.dirname, "../certs"),
  logger: console.log,
});
```

**Options:** `certsPath` (required, absolute path to the certificates directory), `logger` (optional `(message: string) => void`; silent when omitted).

**Throws** if the path is invalid, inaccessible, or certificate generation fails.

## Certificate Details 📜

| Property                | Value                                          |
| ----------------------- | ---------------------------------------------- |
| Key algorithm           | RSA 2048-bit                                   |
| Signature               | SHA-256                                        |
| Validity                | 1 year from generation                         |
| Common Name             | `localhost`                                    |
| Subject Alt Names       | `localhost`, `127.0.0.1`, `::1`                |
| Basic Constraints       | `CA:FALSE` (critical)                          |
| Key Usage               | Digital Signature, Key Encipherment (critical) |
| Extended Key Usage      | TLS Web Server Authentication                  |
| Private key permissions | `600` (Unix only)                              |

## Smart Reuse ♻️

Existing `key.pem` and `cert.pem` files are reused when all of these hold:

1. **File existence** — both files are present
2. **Expiry** — the certificate is not expired or expiring within 5 minutes
3. **Not-before** — the certificate is already valid
4. **SANs** — they include `localhost`, `127.0.0.1`, and `::1`
5. **Key size** — RSA keys are at least 2048-bit
6. **Key/cert pairing** — the private key matches the certificate
7. **Self-signature** — a self-issued certificate verifies against its own key

Certificates from your own CA (for example, mkcert) pass these checks and are kept. The Common Name is not checked.

If `key.pem` is readable by group or others, its mode is changed to `600` (Unix only). The files are kept.

If any check fails, the existing files are copied to `key.pem.bak` and `cert.pem.bak` (mode `600`), then a new pair is generated. Older backups are never overwritten; later ones are named `key.pem.1.bak`, `key.pem.2.bak`, and so on. If the backup fails, nothing is regenerated.

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
- **Logs are off by default** — pass `logger: console.log` to see what happened

> **Windows:** File permission checks are skipped on Windows.

> **Concurrency:** A lock file (`.generate-certs.lock`) serializes concurrent calls. A lock is taken over only when its owner process is gone or it is older than 60 seconds.

## Breaking Changes in v4 ⚠️

- **Requires Node.js >= 22.12.**
- **`activateLogs` is replaced by `logger`.** Logging is off by default. Pass `logger: console.log` to restore the v3 output.
- **The Common Name is no longer checked.** Valid certificates with other CNs, or none, are kept instead of replaced.
- **CA-issued certificates are kept.** v3 required a self-signature and replaced mkcert-style certificates.
- **An insecure `key.pem` mode is fixed, not replaced.** The key keeps its content and gets mode `600`. If the mode cannot be changed, `generateCerts` throws.
- **Invalid files are backed up before regeneration** as `*.bak`.
- **Existing certificates are validated with `node:crypto`** (`X509Certificate`), so EC and Ed25519 key pairs are accepted.
- **Generated certificates carry `basicConstraints`, `keyUsage`, and `extKeyUsage`.**
- **`node-forge` is `^1.4.2`**, which fixes the October 2026 advisories (including PEM ReDoS and signature forgery). 4.1 drops `node-forge`.

## Type Exports 🏷️

```typescript
import type { GenerateCertsOptions } from "generate-certs";
```

## Credits 🙏

Earlier versions were built on [node-forge](https://www.npmjs.com/package/node-forge). Its tests still use it to build fixtures and to parse generated certificates independently.

## Contributions 🤝

- Open an [issue](https://github.com/WolfieLeader/npm/issues) or feature request
- Submit a PR to improve the package
- Star the repo if you find it useful

<div align="center">
<br/>

Crafted carefully by [WolfieLeader](https://github.com/WolfieLeader)

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

</div>
