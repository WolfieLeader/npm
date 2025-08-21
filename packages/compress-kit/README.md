<div align="center">
<img src="https://github.com/WolfieLeader/npm/blob/main/assets/compress-kit-banner.svg" align="center" alt="banner" />

<h1 align="center" style="font-weight:900;">compress-kit</h1>

<p align="center">
  Reliable, Cross-Platform Compression & Decompression<br/>
  for Web, Node.js, Deno, and Bun
</p>

<a href="https://opensource.org/licenses/MIT" rel="nofollow"><img src="https://img.shields.io/github/license/WolfieLeader/npm?color=DC343B" alt="License"></a>
<a href="https://www.npmjs.com/package/compress-kit" rel="nofollow"><img src="https://img.shields.io/npm/v/compress-kit?color=0078D4" alt="npm version"></a>
<a href="https://www.npmjs.com/package/compress-kit" rel="nofollow"><img src="https://img.shields.io/npm/dy/compress-kit.svg?color=03C03C" alt="npm downloads"></a>
<a href="https://github.com/WolfieLeader/npm" rel="nofollow"><img src="https://img.shields.io/github/stars/WolfieLeader/npm" alt="stars"></a>

</div>

## About 📖

`compress-kit` is a modern compression toolkit for **Web**, **Node.js**, **Deno**, and **Bun**.  
It offers a simple, consistent API for compressing and decompressing strings or objects, automatically deciding when compression is beneficial, while ensuring lossless results and type safety.

## Features 🌟

- 📉 **Strong Compression** – Achieves size reductions of ~30% to 90% on typical text and JSON data using the Deflate algorithm via [pako](https://www.npmjs.com/package/pako).
- 🧠 **Smart Compression** – Automatically detects whether to store data compressed or uncompressed for optimal efficiency.
- 🌐 **Cross-Platform** – Works seamlessly in Web, Node.js, Deno, and Bun with no code changes.
- 🔁 **Lossless Algorithms** – Ensures perfect reconstruction of the original data.
- 🧪 **Strict Validation & `Result<T>` Typing** – Unified return type and robust input checks for predictable results.

## Installation 🔥

```bash
npm install compress-kit@latest
```

> 💡 Works with `npm`, `pnpm`, `yarn`, `bun`, and `deno`. You can use it in dev dependencies since it's typically used only for local HTTPS.

## Usage 🪛

```typescript
import { compress, compressObj, decompress, decompressObj } from 'compress-kit';

// Compressing data
const compressed = compress('The brown fox (🦊) jumps over the lazy dog (🐶).');
if (compressed.success === false) {
  throw new Error(`Compression failed: ${compressed.error}`);
}

// Decompressing data
const decompressed = decompress(compressed.result);
console.log(decompressed.result);

// Compressing an object
const compressedObj = compressObj({ name: 'John Doe', age: 30, city: 'New York' });
if (compressedObj.success === false) {
  throw new Error(`Compression object failed: ${compressedObj.error}`);
}

// Decompressing an object
const decompressedObj = decompressObj(compressedObj.result);
console.log(decompressedObj.result);
```

NOTE: The compressed data follow the following format: `<base64url>.<0 or 1>.`. The first part is the base64url encoded compressed data, and the second part indicates whether the data is compressed (`1`) or not (`0`). The package hands the regex

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
