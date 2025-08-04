<div align="center">
<img src="https://github.com/WolfieLeader/npm/blob/main/assets/compress-kit-banner.svg" align="center" alt="banner" />

<h1 align="center" style="font-weight:900;">compress-kit</h1>

<p align="center">
  A Secure, Reliable, and Cross-platform Package<br/> 
  for Compression and Decompression<br/> 
  Built for Web, Node.js, Deno, and Bun environments
</p>

<a href="https://opensource.org/licenses/MIT" rel="nofollow"><img src="https://img.shields.io/github/license/WolfieLeader/npm?color=DC343B" alt="License"></a>
<a href="https://www.npmjs.com/package/compress-kit" rel="nofollow"><img src="https://img.shields.io/npm/v/compress-kit?color=0078D4" alt="npm version"></a>
<a href="https://www.npmjs.com/package/compress-kit" rel="nofollow"><img src="https://img.shields.io/npm/dy/compress-kit.svg?color=03C03C" alt="npm downloads"></a>
<a href="https://github.com/WolfieLeader/npm" rel="nofollow"><img src="https://img.shields.io/github/stars/WolfieLeader/npm" alt="stars"></a>

</div>

## About 📖

`compress-kit` is a versatile compression toolkit designed to work seamlessly across multiple environments, including:

- **Web** (using the Web Crypto API)
- **Node.js**
- **Deno**
- **Bun**

It provides a simple and secure way to compress and decompress data, ensuring that your sensitive information remains protected regardless of the platform you are using, with error handling and type safety in mind.

## Features 🌟

- 🧠 **Efficiency** – Detects whether the output should be compressed or not, optimizing performance.
- 🌐 **Cross-Platform Support** – Works seamlessly in Web, Node.js, Deno, and Bun environments.
- 🧪 **Strict Input Validation and `Result` Typing** - Using unified `Result<T>` type and strict input validation to ensure type safety and prevent errors.
- 🔁 **Lossless Compression** – Ensures that the original data can be perfectly reconstructed from the compressed data via `pako` algorithms.

## Installation 🔥

```bash
npm install compress-kit
```

> 💡 Works with `npm`, `pnpm`, `yarn`, `bun`, and `deno`. You can use it in dev dependencies since it's typically used only for local HTTPS.

## Credit 💪🏽

We want to thank [Pako](https://github.com/nodeca/pako) for the inflate and deflate algorithms used in this package.

## Contributions 🤝

Want to contribute or suggest a feature?

- Open an issue or feature request
- Submit a PR to improve the packages or add new ones
- Star ⭐ the repo if you like what you see

## License 📜

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

Thank you!
