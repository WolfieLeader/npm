<div align="center">
<img src="https://github.com/WolfieLeader/npm/blob/main/assets/repo-banner.svg" align="center" alt="banner" /><br/><br/>

<p align="center">
  A monorepo for developer-focused <br/>
  NPM packages built for performance,<br/>
  security, and simplicity.
</p><br/>

<p align="center"><a href="https://github.com/WolfieLeader/npm/blob/main/packages/cipher-kit/README.md"><img alt="cipher-kit" src="https://img.shields.io/badge/cipher--kit-791AFF?style=for-the-badge&logoColor=white"></a> <a href="https://github.com/WolfieLeader/npm/blob/main/packages/compress-kit/README.md"><img alt="compress-kit" src="https://img.shields.io/badge/compress--kit-14B814?style=for-the-badge&logoColor=white"></a> <a href="https://github.com/WolfieLeader/npm/blob/main/packages/get-client-ip/README.md"><img alt="get-client-ip" src="https://img.shields.io/badge/get--client--ip-FF453A?style=for-the-badge&logoColor=white"></a> <a href="https://github.com/WolfieLeader/npm/blob/main/packages/generate-certs/README.md"><img alt="generate-certs" src="https://img.shields.io/badge/generate--certs-FF9F1A?style=for-the-badge&logoColor=white"></a> <a href="https://github.com/WolfieLeader/npm/blob/main/packages/modern-cookies/README.md"><img alt="modern-cookies" src="https://img.shields.io/badge/modern--cookies-CF6317?style=for-the-badge&logoColor=white"></a></p>
</div>

## Packages 📦

### `cipher-kit` 🔐

<a href="https://www.npmjs.com/package/cipher-kit" rel="nofollow"><img src="https://img.shields.io/npm/v/cipher-kit?color=0078D4" alt="npm version"></a>
<a href="https://www.npmjs.com/package/cipher-kit" rel="nofollow"><img src="https://img.shields.io/npm/dt/cipher-kit.svg?color=03C03C" alt="npm downloads"></a>

Secure, Modern, and Cross-Platform Cryptography Helpers for Web, Node.js, Deno, Bun, and Cloudflare Workers.

- 🛡️ **Secure and Flexible** - Uses best practices and modern cryptographic techniques, while providing a flexible and simple API.
- 📦 **All-in-One Toolkit** – Combines encryption, hashing, encoding, serialization, and more into a single package.
- 🌐 **Cross-Platform** – Works seamlessly across Web, Node.js, Deno, Bun, and Cloudflare Workers.
- 💡 **Typed and Ergonomic** - Type-safe API with both throwing and non-throwing (`Result`) flavors.
- 🌳 **Tree-Shakable** - Import from the root or from platform-specific entry points to keep bundles lean.
- 🚫 **Zero Dependencies** – Fully self-contained, no external libraries required.
- 🍼 **Explain Like I'm Five** - Newbie-friendly explanations and documentation.

📖 [View README →](./packages/cipher-kit/README.md)

### `compress-kit` 🔬

<a href="https://www.npmjs.com/package/compress-kit" rel="nofollow"><img src="https://img.shields.io/npm/v/compress-kit?color=0078D4" alt="npm version"></a>
<a href="https://www.npmjs.com/package/compress-kit" rel="nofollow"><img src="https://img.shields.io/npm/dt/compress-kit.svg?color=03C03C" alt="npm downloads"></a>

Reliable, Cross-Platform Compression & Decompression for Web, Node.js, Deno, Bun and Cloudflare Workers

- 📉 **Strong Compression** – Achieves size reductions of ~30% to 90% on typical text and JSON data using the Deflate algorithm via [`pako`](https://www.npmjs.com/package/pako).
- 🔁 **Lossless Algorithms** – Ensures perfect reconstruction of the original data.
- 🧪 **Strict Validation** - Robust input checks and type validation for predictable results.
- 🌐 **Cross-Platform** – Works seamlessly in Web, Node.js, Deno, Bun and Cloudflare Workers.
- 💡 **Typed and Ergonomic** - Type-safe API with both throwing and non-throwing (`Result`) flavors.
- 🍼 **Explain Like I'm Five** - Newbie-friendly explanations and documentation.

📖 [View README →](./packages/compress-kit/README.md)

### `get-client-ip` 📍

<a href="https://www.npmjs.com/package/get-client-ip" rel="nofollow"><img src="https://img.shields.io/npm/v/get-client-ip?color=0078D4" alt="npm version"></a> <a href="https://www.npmjs.com/package/get-client-ip" rel="nofollow"><img src="https://img.shields.io/npm/dt/get-client-ip.svg?color=03C03C" alt="npm downloads"></a>

A Lightweight Utility for Extracting the Real Client IP Address from Incoming HTTP Requests

- 🌐 **Header-Aware Detection** – Parses standard and cloud-specific proxy headers.
- 🧠 **Smart Parsing** – Handles multiple IPs, comma-separated values, and arrays.
- 🧩 **Middleware-Compatible** – Use as drop-in Express/NestJS middleware.
- 💪🏽 **Works in Standalone Mode** – Can be used as a simple function.
- ⚙️ **Type-Safe & Cross-Compatible** – Fully written in TypeScript with native types. Works in both ESM and CommonJS runtimes.

📖 [View README →](./packages/get-client-ip/README.md)

### `generate-certs` 🗝️

<a href="https://www.npmjs.com/package/generate-certs" rel="nofollow"><img src="https://img.shields.io/npm/v/generate-certs?color=0078D4" alt="npm version"></a>
<a href="https://www.npmjs.com/package/generate-certs" rel="nofollow"><img src="https://img.shields.io/npm/dt/generate-certs.svg?color=03C03C" alt="npm downloads"></a>

Effortless HTTPS certificate generation for local development environments.

- 🔐 **Automatic Certificate Generation** – Creates valid self-signed certificates for `localhost`.
- 🔁 **Reusability** – Automatically detects and reuses existing certs if they exist.
- 🧪 **Development-Ready** – Ideal for testing HTTPS locally without browser complaints.
- 💡 **Minimal Setup** – No OpenSSL or third-party installations required.
- 🧩 **Framework Friendly** – Easily integrates with Express, NestJS, and other Node.js frameworks.

📖 [View README →](./packages/generate-certs/README.md)

### `modern-cookies` 🍪

<a href="https://www.npmjs.com/package/modern-cookies" rel="nofollow"><img src="https://img.shields.io/npm/v/modern-cookies?color=0078D4" alt="npm version"></a>
<a href="https://www.npmjs.com/package/modern-cookies" rel="nofollow"><img src="https://img.shields.io/npm/dt/modern-cookies.svg?color=03C03C" alt="npm downloads"></a>

A Lightweight and Modern Cookie Utility for Express and Nest.js

- 💡 **Simple API** — Intuitive functions `setCookie`, `getCookie`, and `deleteCookie` for effortless cookie management.
- 🔨 **Built on Reliability** — Uses the proven [cookie](https://www.npmjs.com/package/cookie) library for RFC-compliant parsing and serialization.
- ❌ **Graceful Error Handling** — Returns `false` on failures and provides a `logError` flag for optional console logging.
- 🛡️ **Security-Aware Defaults** — Automatically enforces rules for special prefixes: `__Secure-` and `__Host-`.
- ⚙️ **Type-Safe & Cross-Compatible** — Fully written in TypeScript with complete type definitions. Works in both ESM and CommonJS runtimes.

📖 [View README →](./packages/modern-cookies/README.md)

## Tooling 🧰

This monorepo uses modern tooling to ensure a smooth development experience:

- **TypeScript** - Strongly typed JavaScript for better maintainability.
- **PNPM** - Fast, disk-efficient package manager.
- **Turborepo** - High-performance build system for monorepos.
- **Tsup** - Zero-config bundler for TypeScript projects.
- **Biome** - Linter, formatter, and type checker for JavaScript/TypeScript.
- **Vitest** - Fast and lightweight test runner.

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
