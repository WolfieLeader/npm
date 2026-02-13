<div align="center">
<img src="https://github.com/WolfieLeader/npm/blob/main/assets/repo-banner.svg" align="center" alt="banner" />

<br/><br/>

<p>Developer-focused npm packages for security, compression, and server utilities.<br/>
TypeScript-first. Minimal dependencies. Production-ready.</p>

<p align="center"><a href="https://github.com/WolfieLeader/npm/blob/main/packages/cipher-kit/README.md"><img alt="cipher-kit" src="https://img.shields.io/badge/cipher--kit-791AFF?style=for-the-badge&logoColor=white"></a> <a href="https://github.com/WolfieLeader/npm/blob/main/packages/compress-kit/README.md"><img alt="compress-kit" src="https://img.shields.io/badge/compress--kit-14B814?style=for-the-badge&logoColor=white"></a> <a href="https://github.com/WolfieLeader/npm/blob/main/packages/get-client-ip/README.md"><img alt="get-client-ip" src="https://img.shields.io/badge/get--client--ip-FF453A?style=for-the-badge&logoColor=white"></a> <a href="https://github.com/WolfieLeader/npm/blob/main/packages/generate-certs/README.md"><img alt="generate-certs" src="https://img.shields.io/badge/generate--certs-FF9F1A?style=for-the-badge&logoColor=white"></a> <a href="https://github.com/WolfieLeader/npm/blob/main/packages/modern-cookies/README.md"><img alt="modern-cookies" src="https://img.shields.io/badge/modern--cookies-CF6317?style=for-the-badge&logoColor=white"></a></p>

</div>

## Packages 📦

### cipher-kit 🔐

<a href="https://www.npmjs.com/package/cipher-kit" rel="nofollow"><img src="https://img.shields.io/npm/v/cipher-kit?color=0078D4" alt="npm version"></a>
<a href="https://www.npmjs.com/package/cipher-kit" rel="nofollow"><img src="https://img.shields.io/npm/dt/cipher-kit.svg?color=03C03C" alt="npm downloads"></a>

Cross-platform cryptography for Node.js, browsers, Deno, Bun, and Cloudflare Workers.

- **Zero dependencies** — fully self-contained
- **AES-256-GCM encryption** with HKDF key derivation
- **PBKDF2 password hashing** with 320K iterations and constant-time verification
- **Type-safe** with throwing and `Result<T>` variants for every function
- **Tree-shakable** — import from `cipher-kit/node` or `cipher-kit/web-api`

```bash
npm install cipher-kit
```

[View docs](./packages/cipher-kit/README.md)

---

### compress-kit 🔬

<a href="https://www.npmjs.com/package/compress-kit" rel="nofollow"><img src="https://img.shields.io/npm/v/compress-kit?color=0078D4" alt="npm version"></a>
<a href="https://www.npmjs.com/package/compress-kit" rel="nofollow"><img src="https://img.shields.io/npm/dt/compress-kit.svg?color=03C03C" alt="npm downloads"></a>

Cross-platform string compression using DEFLATE. 30-90% size reduction on typical text and JSON.

- **Lossless DEFLATE** via [`pako`](https://www.npmjs.com/package/pako)
- **Automatic passthrough** — skips compression when it isn't beneficial
- **Decompression bomb protection** via `maxOutputSize` with streaming abort
- **Type-safe** with throwing and `Result<T>` variants

```bash
npm install compress-kit
```

[View docs](./packages/compress-kit/README.md)

---

### get-client-ip 📍

<a href="https://www.npmjs.com/package/get-client-ip" rel="nofollow"><img src="https://img.shields.io/npm/v/get-client-ip?color=0078D4" alt="npm version"></a>
<a href="https://www.npmjs.com/package/get-client-ip" rel="nofollow"><img src="https://img.shields.io/npm/dt/get-client-ip.svg?color=03C03C" alt="npm downloads"></a>

Extract the real client IP from HTTP requests behind any proxy or CDN.

- **12+ proxy headers** checked in priority order (Cloudflare, Fastly, Akamai, AWS)
- **Standalone function** or Express/NestJS middleware
- **Auto-populates** `req.clientIp` and `req.clientIps` with TypeScript support
- **Zero config** — validates IPs using Node.js `net.isIP()`

```bash
npm install get-client-ip
```

[View docs](./packages/get-client-ip/README.md)

---

### generate-certs 🗝️

<a href="https://www.npmjs.com/package/generate-certs" rel="nofollow"><img src="https://img.shields.io/npm/v/generate-certs?color=0078D4" alt="npm version"></a>
<a href="https://www.npmjs.com/package/generate-certs" rel="nofollow"><img src="https://img.shields.io/npm/dt/generate-certs.svg?color=03C03C" alt="npm downloads"></a>

Self-signed HTTPS certificates for local development. No OpenSSL required.

- **Auto-generates and validates** — checks expiry, permissions, and key/cert pairing
- **Smart reuse** — reuses existing certs when they're still valid
- **Framework-ready** — Express, NestJS, Hono, Fastify
- **Secure file permissions** enforced (Unix: `600` on private key)

```bash
npm install -D generate-certs
```

[View docs](./packages/generate-certs/README.md)

---

### modern-cookies 🍪

<a href="https://www.npmjs.com/package/modern-cookies" rel="nofollow"><img src="https://img.shields.io/npm/v/modern-cookies?color=0078D4" alt="npm version"></a>
<a href="https://www.npmjs.com/package/modern-cookies" rel="nofollow"><img src="https://img.shields.io/npm/dt/modern-cookies.svg?color=03C03C" alt="npm downloads"></a>

Type-safe cookie management for Express and NestJS with automatic security enforcement.

- **`setCookie`, `getCookie`, `deleteCookie`** — complete cookie API
- **Auto-enforces** `__Secure-` and `__Host-` prefix rules
- **`sameSite: "none"` forces `secure: true`** — prevents silent browser rejection
- **Graceful error handling** — returns `boolean`, never throws

```bash
npm install modern-cookies
```

[View docs](./packages/modern-cookies/README.md)

---

## Tooling ⚒️

| Tool                                              | Purpose                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| [TypeScript 5.9](https://www.typescriptlang.org/) | Strict types with `verbatimModuleSyntax` and `nodenext` resolution |
| [pnpm](https://pnpm.io/)                          | Workspace management and dependency resolution                     |
| [Turborepo](https://turbo.build/)                 | Cached, dependency-aware builds across packages                    |
| [Just](https://just.systems/)                     | Handy way to save and run project-specific commands                |
| [tsup](https://tsup.egoist.dev/)                  | Dual ESM/CJS output for every package                              |
| [Biome](https://biomejs.dev/)                     | Linting and formatting (replaces ESLint + Prettier)                |
| [Vitest](https://vitest.dev/)                     | Testing with TypeScript type checking                              |

## Contributing 🤝

- Open an [issue](https://github.com/WolfieLeader/npm/issues) or feature request
- Submit a PR to improve the packages or add new ones
- Star the repo if you find it useful

<div align="center">
<br/>

Crafted carefully by [WolfieLeader](https://github.com/WolfieLeader)

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

</div>
