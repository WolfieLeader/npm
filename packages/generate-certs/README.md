# 🔐 Generate Local SSL Certificates 🔐

## Overview 🪟

This package helps you generate self-signed SSL certificates for local development, making it easy to set up secure HTTPS servers in development environments. By providing a streamlined way to create certificates, it allows developers to test and deploy HTTPS configurations locally without external dependencies.

## Features 💡

- **Generates Certs** - Automatically generates `key.pem` and `cert.pem` files.
- **Reusable** - Checks for existing certificates and reuses them if available.
- **Simple Integration** - Seamlessly integrates with Express and NestJS applications.
- **Development-Ready** - Perfect for setting up HTTPS servers during development, allowing you to test secure features.
- **Easy Production Transition** - Keep the same code for production, simply replace the certificates with those from a trusted certificate authority.

## Getting Started 🚀

Ensure [Node.js](https://nodejs.org/) is installed on your machine.

Install the package by running:

```bash
npm install -D generate-certs
```

- **Tip**: We recommend using [PNPM](https://pnpm.io/) for package management.

## Usage 🪛

### _Generating Certificates_ 🔑

Import the `generateCerts` function and specify the path to store your certificates:

```typescript
import generateCerts from 'generate-certs';
import path from 'node:path';

const CERTIFICATES_PATH = path.resolve(__dirname, '../certs');
const certs = generateCerts({ certsPath: CERTIFICATES_PATH });
```

### _Integration with Express_ 📫

Set up HTTPS in an Express app using the generated certificates:

```typescript
import express from 'express';
import generateCerts from 'generate-certs';
import path from 'node:path';
import https from 'node:https';
import { env } from './config/env';

const certs = generateCerts({ certsDir: path.resolve(__dirname, '../certs'), log: true });

function bootstrap() {
  const app = express();
  // Other configurations...
  const server = https.createServer(certs, app);
  const port = Number(env.PORT) || 3443;

  server.listen(port, () => {
    console.log(`🚀 Express server running on: https://localhost:${port}`);
  });
}

bootstrap();
```

### _Integration with NestJS_ 🪺

Set up HTTPS in a NestJS app using the generated certificates:

```typescript
import { NestFactory } from '@nestjs/core';
import generateCerts from 'generate-certs';
import { AppModule } from './app.module';
import path from 'node:path';
import { env } from './config/env';

const certs = generateCerts({ certsDir: path.resolve(__dirname, '../certs'), log: true });

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    httpsOptions: certs,
  });
  // Other configurations...
  const port = Number(env.PORT) || 3000;

  await app.listen(port);
  console.log(`🚀 NestJS server running on: https://localhost:${port}`);
}

bootstrap();
```

## Notes❗

- **First-Time Run**: The package generates self-signed certificates and stores them in the specified `certs` directory.
- **Browser Warning**: When accessing `https://localhost:<PORT>`, you may see a browser warning for an untrusted certificate. This is expected with self-signed certificates; proceed by selecting "Advanced" and "Proceed to localhost (unsafe)".
- **Do Not Use in Production**: These certificates are for local development only. Use a trusted certificate authority for production.
- **Permissions**: Ensure the `certs` directory has appropriate read permissions.

## Contributing 🤝

Contributions are welcome! Feel free to open an issue or submit a pull request if you have any improvements or bug fixes to the project.
