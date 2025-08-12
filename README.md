<div align="center">
<img src="https://github.com/WolfieLeader/npm/blob/main/assets/repo-banner-light.svg" align="center" alt="banner" />

<h1 align="center" style="font-weight:900;">NPM Packages</h1>

<p align="center">
  A monorepo for developer-focused <br/>
  NPM packages built for performance, security, and simplicity.
</p>

<a href="https://opensource.org/licenses/MIT" rel="nofollow"><img src="https://img.shields.io/github/license/WolfieLeader/npm?color=DC343B" alt="License"></a>
<a href="https://github.com/WolfieLeader/npm" rel="nofollow"><img src="https://img.shields.io/github/stars/WolfieLeader/npm" alt="stars"></a>

</div>

## About 📖

This monorepo contains a collection of high-quality, modern NPM packages built to improve the developer experience in JavaScript and TypeScript Ecosystems.

Each package is fast, type-safe, and production-ready — written in TypeScript with native typings — and works seamlessly in both **ESM** and **CommonJS** runtimes.

## Packages 📦

### `cipher-kit` 🔐

<a href="https://www.npmjs.com/package/cipher-kit" rel="nofollow"><img src="https://img.shields.io/npm/v/cipher-kit?color=0078D4" alt="npm version"></a>
<a href="https://www.npmjs.com/package/cipher-kit" rel="nofollow"><img src="https://img.shields.io/npm/dy/cipher-kit.svg?color=03C03C" alt="npm downloads"></a>

Secure, Lightweight, and Cross-Platform Encryption & Decryption for Web, Node.js, Deno, and Bun

- 🛡️ **AES-GCM Encryption** – Secure and authenticated encryption with built-in integrity checks.
- 🌐 **Cross-Platform** – Works in Web, Node.js, Deno, and Bun without code changes.
- 🚫 **Zero Dependencies** – Fully self-contained, no external libraries required.
- 🔒 **SHA-256 Key Derivation** – Derives strong encryption keys from passwords.
- 🧪 **Strict Validation & `Result<T>` Typing** – Unified return type with robust input validation.

📖 [View README →](./packages/cipher-kit/README.md)

### `compress-kit` 🔬

<a href="https://www.npmjs.com/package/compress-kit" rel="nofollow"><img src="https://img.shields.io/npm/v/compress-kit?color=0078D4" alt="npm version"></a>
<a href="https://www.npmjs.com/package/compress-kit" rel="nofollow"><img src="https://img.shields.io/npm/dy/compress-kit.svg?color=03C03C" alt="npm downloads"></a>

Reliable, Cross-Platform Compression & Decompression for Web, Node.js, Deno, and Bun

- 📉 **Strong Compression** – Achieves size reductions of ~30% to 90% on typical text and JSON data using the Deflate algorithm via [pako](https://www.npmjs.com/package/pako).
- 🧠 **Smart Compression** – Automatically detects whether to store data compressed or uncompressed for optimal efficiency.
- 🌐 **Cross-Platform** – Works seamlessly in Web, Node.js, Deno, and Bun with no code changes.
- 🔁 **Lossless Algorithms** – Ensures perfect reconstruction of the original data.
- 🧪 **Strict Validation & `Result<T>` Typing** – Unified return type and robust input checks for predictable results.

📖 [View README →](./packages/compress-kit/README.md)

### `get-client-ip` 📍

<a href="https://www.npmjs.com/package/get-client-ip" rel="nofollow"><img src="https://img.shields.io/npm/v/get-client-ip?color=0078D4" alt="npm version"></a> <a href="https://www.npmjs.com/package/get-client-ip" rel="nofollow"><img src="https://img.shields.io/npm/dy/get-client-ip.svg?color=03C03C" alt="npm downloads"></a>

A Lightweight Utility for Extracting the Real Client IP Address from Incoming HTTP Requests

- 🌐 **Header-Aware Detection** – Parses standard and cloud-specific proxy headers.
- 🧠 **Smart Parsing** – Handles multiple IPs, comma-separated values, and arrays.
- 🧩 **Middleware-Compatible** – Use as drop-in Express/NestJS middleware.
- 💪🏽 **Works in Standalone Mode** – Can be used as a simple function.
- ⚙️ **Type-Safe & Cross-Compatible** – Fully written in TypeScript with native types. Works in both ESM and CommonJS runtimes.

📖 [View README →](./packages/get-client-ip/README.md)

### `generate-certs` 🗝️

<a href="https://www.npmjs.com/package/generate-certs" rel="nofollow"><img src="https://img.shields.io/npm/v/generate-certs?color=0078D4" alt="npm version"></a>
<a href="https://www.npmjs.com/package/generate-certs" rel="nofollow"><img src="https://img.shields.io/npm/dy/generate-certs.svg?color=03C03C" alt="npm downloads"></a>

Effortless HTTPS certificate generation for local development environments.

- 🔐 **Automatic Certificate Generation** – Creates valid self-signed certificates for `localhost`.
- 🔁 **Reusability** – Automatically detects and reuses existing certs if they exist.
- 🧪 **Development-Ready** – Ideal for testing HTTPS locally without browser complaints.
- 💡 **Minimal Setup** – No OpenSSL or third-party installations required.
- 🧩 **Framework Friendly** – Easily integrates with Express, NestJS, and other Node.js frameworks.
- ⚙️ **Type-Safe & Cross-Compatible** – Fully written in TypeScript with native types. Works in both ESM and CommonJS runtimes.

📖 [View README →](./packages/generate-certs/README.md)

### `modern-cookies` 🍪

<a href="https://www.npmjs.com/package/modern-cookies" rel="nofollow"><img src="https://img.shields.io/npm/v/modern-cookies?color=0078D4" alt="npm version"></a>
<a href="https://www.npmjs.com/package/modern-cookies" rel="nofollow"><img src="https://img.shields.io/npm/dy/modern-cookies.svg?color=03C03C" alt="npm downloads"></a>

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

Want to contribute or suggest a feature?

- Open an issue or feature request
- Submit a PR to improve the packages or add new ones
- Star ⭐ the repo if you like what you see

## License 📜

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

Thank you!
