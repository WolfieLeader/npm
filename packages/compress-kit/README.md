<div align="center">
<img src="https://github.com/WolfieLeader/npm/blob/main/assets/compress-kit-banner.svg" align="center" alt="banner" />

<h1 align="center" style="font-weight:900;">compress-kit</h1>

<p align="center">
  Reliable, Cross-Platform Compression & Decompression for Web, Node.js, <br/>
  Deno, Bun and Cloudflare Workers
</p>

<a href="https://opensource.org/licenses/MIT" rel="nofollow"><img src="https://img.shields.io/github/license/WolfieLeader/npm?color=DC343B" alt="License"></a>
<a href="https://www.npmjs.com/package/compress-kit" rel="nofollow"><img src="https://img.shields.io/npm/v/compress-kit?color=0078D4" alt="npm version"></a>
<a href="https://www.npmjs.com/package/compress-kit" rel="nofollow"><img src="https://img.shields.io/npm/dt/compress-kit.svg?color=03C03C" alt="npm downloads"></a>
<a href="https://github.com/WolfieLeader/npm" rel="nofollow"><img src="https://img.shields.io/github/stars/WolfieLeader/npm" alt="stars"></a>

</div>

## Why `compress-kit`? 🤔

- 📉 **Strong Compression** – Achieves size reductions of ~30% to 90% on typical text and JSON data using the Deflate algorithm via [`pako`](https://www.npmjs.com/package/pako).
- 🔁 **Lossless Algorithms** – Ensures perfect reconstruction of the original data.
- 🧪 **Strict Validation** - Robust input checks and type validation for predictable results.
- 🌐 **Cross-Platform** – Works seamlessly in Web, Node.js, Deno, Bun and Cloudflare Workers.
- 💡 **Typed and Ergonomic** - Type-safe API with both throwing and non-throwing (`Result`) flavors.

## Installation 🔥

```bash
npm install compress-kit@latest
# or
yarn add compress-kit@latest
# or
pnpm install compress-kit@latest
# or
bun add compress-kit@latest
```

## Quick Start 🚀

```typescript
import { compress, compressObj, decompress, decompressObj } from "compress-kit";

const compressed = compress(longString);
const original = decompress(compressed);
console.log(original);

const compressedObj = compressObj(longObject);
const originalObj = decompressObj<typeof longObject>(compressedObj);
console.log(originalObj);
```

## API Reference 📚

### The `try` Prefix (Non-Throwing `Result` API) 🤔

The `try` prefix functions return a `Result<T>` object that indicates success or failure without throwing exceptions.

This is useful in scenarios where you want to handle errors gracefully without using `try/catch` blocks.

```typescript
// Throwing version - simpler but requires try/catch
const msg = compress("long message");
console.log(`Compressed message: ${msg}`);
// Non-throwing version - returns a Result<T> object
const msg = tryCompress("long message");

// Either check for success status
if (msg.success) console.log(`Compressed message: ${msg.result}`);
else console.error(`${msg.error.message} - ${msg.error.description}`);

// Or Check that there is no error
if (!msg.error) console.log(`Compressed message: ${msg.result}`);
else console.error(`${msg.error.message} - ${msg.error.description}`);
```

### Compression & Decompression 🤫

Compression is the process of reducing a data's size by removing redundancies, making it faster to transmit and requiring less storage space. Decompression is the reverse process, restoring the original data from its compressed form.

```typescript
import { compress, compressObj, decompress, decompressObj } from "compress-kit";

const longString = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`;

const compressed = compress(longString);
const original = decompress(compressed);
console.log(original);

const longObj = {
  name: "John Doe",
  age: 30,
  city: "New York",
  occupation: "Developer",
  hobbies: ["coding", "gaming", "reading"],
  isActive: true,
  scores: { math: 95, english: 88, science: 92 },
  friends: ["Alice", "Bob", "Charlie"],
};

const compressedObj = compressObj(longObj);
const originalObj = decompressObj<typeof longObj>(compressedObj);
console.log(originalObj);
```

The `compress` and `decompress` functions handle strings, while `compressObj` and `decompressObj` work with JavaScript objects, serializing them to JSON for compression. They both accept an optional `option` parameter to customize the compression process.

```typescript
export interface CompressOptions {
  // Encoding format for the output compressed data (default: `'base64url'`).
  outputEncoding?: "base64" | "base64url" | "hex";

  // Compression level (1-9; default: 6).
  level?: number;

  // Size of the compression window: 2^windowBits (8-15; default: 15).
  windowBits?: number;

  // Memory usage for compression match finder (1-9; default: 8).
  memLevel?: number;

  // Compression strategy, 95% of cases should use 'default' (default: 'default').
  strategy?: "default" | "filtered" | "huffmanOnly" | "rle" | "fixed";
}

export interface DecompressOptions {
  // Encoding format for the input compressed data (default: `'base64url'`).
  inputEncoding?: "base64" | "base64url" | "hex";

  // Size of the compression window: 2^windowBits (8-15; default: 15).
  windowBits?: number;

  // Maximum allowed decompressed output size in bytes. Aborts early if exceeded (decompression bomb protection).
  maxOutputSize?: number;
}
```

## Credit 💪🏽

Huge credit to [`pako`](https://www.npmjs.com/package/pako) for the underlying compression and decompression algorithms used in this package.

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
