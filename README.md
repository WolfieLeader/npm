<p align="center">
  <img src="https://github.com/WolfieLeader/npm/blob/main/assets/repo-banner.svg" align="center" alt="banner" />

  <h1 align="center" style="font-weight:900;">NPM Packages</h1>

  <p align="center">
    A monorepo for developer-focused <br/>
    NPM packages built for performance, security, and simplicity.
  </p>
</p>

<p align="center">
<a href="https://opensource.org/licenses/MIT" rel="nofollow"><img src="https://img.shields.io/github/license/WolfieLeader/npm?color=DC343B" alt="License"></a>
<a href="https://github.com/WolfieLeader/npm" rel="nofollow"><img src="https://img.shields.io/github/stars/WolfieLeader/npm" alt="stars"></a>
</p>

## About 📖

This monorepo contains a collection of high-quality, modern NPM packages designed to improve the developer experience in Node.js applications.

Each package focuses on being fast, highly usable, and production-friendly, while offering seamless support for both **ESM** and **CommonJS** runtimes.

## Packages 📦

### [get-client-ip](https://www.npmjs.com/package/get-client-ip)

> A Lightweight Utility for Extracting the Real Client IP Address from Incoming HTTP Requests

- 🌐 **Header-Aware Detection** – Parses standard and cloud-specific proxy headers.
- 🧠 **Smart Parsing** – Handles multiple IPs, comma-separated values, and arrays.
- 🧩 **Middleware-Compatible** – Use as drop-in Express/NestJS middleware.
- 💪🏽 **Works in Standalone Mode** – Can be used as a simple function.
- ⚙️ **Cross-Compatible** – Works in both ESM and CommonJS runtimes.

📖 [View README →](./packages/get-client-ip/README.md)

### [generate-certs](https://www.npmjs.com/package/generate-certs)

> Effortless HTTPS certificate generation for local development environments.

- 🔐 **Automatic Certificate Generation** – Creates valid self-signed certificates for `localhost`.
- 🔁 **Reusability** – Automatically detects and reuses existing certs if they exist.
- 🧪 **Development-Ready** – Ideal for testing HTTPS locally without browser complaints.
- 💡 **Minimal Setup** – No OpenSSL or third-party installations required.
- 🧩 **Framework Friendly** – Easily integrates with Express, NestJS, and other Node.js frameworks.
- ⚙️ **Cross-Compatible** – Works in both ESM and CommonJS runtimes.

📖 [View README →](./packages/generate-certs/README.md)

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
