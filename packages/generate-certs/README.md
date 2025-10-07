<div align="center">
<img src="https://github.com/WolfieLeader/npm/blob/main/assets/generate-certs-banner.svg" align="center" alt="banner" />

<h1 align="center" style="font-weight:900;">generate-certs</h1>

<p align="center">
  Effortless HTTPS certificate generation<br/>
  for local development environments.
</p>

<a href="https://opensource.org/licenses/MIT" rel="nofollow"><img src="https://img.shields.io/github/license/WolfieLeader/npm?color=DC343B" alt="License"></a>
<a href="https://www.npmjs.com/package/generate-certs" rel="nofollow"><img src="https://img.shields.io/npm/v/generate-certs?color=0078D4" alt="npm version"></a>
<a href="https://www.npmjs.com/package/generate-certs" rel="nofollow"><img src="https://img.shields.io/npm/dt/generate-certs.svg?color=03C03C" alt="npm downloads"></a>
<a href="https://github.com/WolfieLeader/npm" rel="nofollow"><img src="https://img.shields.io/github/stars/WolfieLeader/npm" alt="stars"></a>

</div>

## About 📖

`generate-certs` is a simple and developer-friendly utility for generating self-signed HTTPS certificates during local development.

It streamlines the process of creating `key.pem` and `cert.pem` files, supports both CommonJS and ES Modules, and integrates seamlessly into frameworks like Express and NestJS.

## Features 💡

- 🔐 **Automatic Certificate Generation** – Creates valid self-signed certificates for `localhost`.
- 🔁 **Reusability** – Automatically detects and reuses existing certs if they exist.
- 🧪 **Development-Ready** – Ideal for testing HTTPS locally without browser complaints.
- 💡 **Minimal Setup** – No OpenSSL or third-party installations required.
- 🧩 **Framework Friendly** – Easily integrates with Express, NestJS, and other Node.js frameworks.
- ⚙️ **Type-Safe & Cross-Compatible** – Fully written in TypeScript with native types. Works in both ESM and CommonJS runtimes.

## Installation 🔥

```bash
npm install -D generate-certs@latest
```

> 💡 Works with `npm`, `pnpm`, and `yarn`. You can use it in dev dependencies since it's typically used only for local HTTPS.

## Usage 🪛

### Basic Example 🐣

```typescript
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateCerts } from "generate-certs";

// If you are using ESM do the following, otherwise you can skip this part
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const certs = generateCerts({ certsPath: path.resolve(__dirname, "../certs") });
```

### Express 📫

```typescript
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateCerts } from "generate-certs";
import express from "express";
import { env } from "./env";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const certs = generateCerts({ certsPath: path.resolve(__dirname, "../certs") });

function bootstrap() {
  const app = express();

  https.createServer(certs, app).listen(env.PORT || 3443, () => {
    console.log(`🚀 Express server running on: https://localhost:${env.PORT || 3443}`);
  });
}

bootstrap();
```

### NestJS 🪺

```typescript
import path from "node:path";
import { NestFactory } from "@nestjs/core";
import { generateCerts } from "generate-certs";
import { AppModule } from "./app.module";
import { env } from "./env";

// NestJS commonly uses CommonJS, so you can skip the ESM import part
const certs = generateCerts({ certsPath: path.resolve(__dirname, "../certs") });

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    httpsOptions: certs,
  });

  await app.listen(env.SERVER_PORT || 3443);
  console.log(`🚀 NestJS server running on: https://localhost:${env.SERVER_PORT || 3443}`);
}

bootstrap();
```

### HonoJS 🔥

```typescript
import { createSecureServer } from "node:http2";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { generateCerts } from "generate-certs";
import { Hono } from "hono";
import { env } from "./env";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const certs = generateCerts({ certsPath: path.resolve(__dirname, "../certs") });

function bootstrap() {
  const app = new Hono();

  serve(
    {
      fetch: app.fetch,
      port: env.PORT || 3443,
      createServer: createSecureServer,
      serverOptions: certs,
    },
    (info) => {
      console.log(`🚀 HonoJS server running on: https://localhost:${env.PORT || 3443}`);
    },
  );
}

bootstrap();
```

### Fastify ⚡

```typescript
import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import { generateCerts } from "generate-certs";
import { env } from "./env";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const certs = generateCerts({ certsPath: path.resolve(__dirname, "../certs") });

async function bootstrap() {
  const app = new Fastify({ https: certs });

  await app.listen({ port: env.PORT || 3443, host: "0.0.0.0" });
  console.log(`🚀 Fastify server running on: https://localhost:${env.PORT || 3443}`);
}

bootstrap();
```

## Notes❗

- **🧪 First-Time Run**: The certs are created automatically and stored in the provided folder.
- **⚠️ Browser Warnings**: You may see “Not Secure” warnings with self-signed certs — click “Advanced” → “Proceed to localhost (unsafe)” to continue.
- **🔒 Not for Production**: These are local dev certificates. For production, use certs from a trusted CA (like Let's Encrypt).
- **📁 Permissions**: Ensure the target folder is writable and readable by your application.

## Contributions 🤝

Want to contribute or suggest a feature?

- Open an issue or feature request
- Submit a PR to improve the packages or add new ones
- Star ⭐ the repo if you like what you see

## License 📜

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

Thank you!
