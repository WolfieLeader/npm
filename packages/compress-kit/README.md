<div align="center">
<img src="https://github.com/WolfieLeader/npm/blob/main/assets/compress-kit-banner.svg" align="center" alt="banner" />

<h1 align="center">compress-kit</h1>

<p align="center">
  Cross-platform string compression using DEFLATE.<br/>
  30-90% size reduction on typical text and JSON.
</p>

<a href="https://opensource.org/licenses/MIT" rel="nofollow"><img src="https://img.shields.io/github/license/WolfieLeader/npm?color=DC343B" alt="License"></a>
<a href="https://www.npmjs.com/package/compress-kit" rel="nofollow"><img src="https://img.shields.io/npm/v/compress-kit?color=0078D4" alt="npm version"></a>
<a href="https://www.npmjs.com/package/compress-kit" rel="nofollow"><img src="https://img.shields.io/npm/dt/compress-kit.svg?color=03C03C" alt="npm downloads"></a>
<a href="https://github.com/WolfieLeader/npm" rel="nofollow"><img src="https://img.shields.io/github/stars/WolfieLeader/npm" alt="stars"></a>

</div>

## Highlights ✨

- **Lossless DEFLATE compression** via [`pako`](https://www.npmjs.com/package/pako)
- **Automatic passthrough** when compression isn't beneficial (data gets larger)
- **Decompression bomb protection** via `maxOutputSize` with streaming abort
- **Type-safe API** with throwing and `Result<T>` variants
- **Cross-platform** — Node.js, Deno, Bun, Cloudflare Workers, and all modern browsers

## Installation 📦

Requires Node.js >= 18.

```bash
npm install compress-kit
# or
pnpm add compress-kit
```

## Quick Start 🚀

```typescript
import { compress, decompress, compressObj, decompressObj } from "compress-kit";

// String compression
const input = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(10);
const compressed = compress(input);
const original = decompress(compressed);
console.log(`${input.length} chars → ${compressed.length} chars`); // significant reduction

// ⚠️ When decompressing untrusted input, always set maxOutputSize to prevent decompression bombs
const safe = decompress(compressed, { maxOutputSize: 1_048_576 }); // 1 MB limit

// Object compression
const data = {
  users: [
    { name: "Alice", role: "admin" },
    { name: "Bob", role: "user" },
  ],
};
const compressedObj = compressObj(data);
const originalObj = decompressObj<typeof data>(compressedObj);
console.log(originalObj.users[0].name); // "Alice"
```

## API Reference 📖

### `compress` / `tryCompress`

Compresses a UTF-8 string. Empty and whitespace-only strings are rejected.

```typescript
import { compress, tryCompress } from "compress-kit";

const compressed = compress("Hello, World!".repeat(100));
console.log(compressed); // base64url-encoded tagged string ending in ".1."

// Max compression with hex encoding
const hex = compress("data".repeat(50), { outputEncoding: "hex", level: 9 });

// Safe variant — returns Result<T> instead of throwing
const result = tryCompress("Hello, World!");
if (result.success) {
  console.log(result.result); // compressed string
}
```

**Options:**

| Option           | Type                                                                   | Default       | Description             |
| ---------------- | ---------------------------------------------------------------------- | ------------- | ----------------------- |
| `outputEncoding` | `"base64url"` \| `"base64"` \| `"hex"`                                 | `"base64url"` | Output encoding         |
| `level`          | `1` \| `2` \| ... \| `9`                                               | `6`           | Compression level       |
| `windowBits`     | `8` \| `9` \| ... \| `15`                                              | `15`          | Window size (2^n)       |
| `memLevel`       | `1` \| `2` \| ... \| `9`                                               | `8`           | Memory for match finder |
| `strategy`       | `"default"` \| `"filtered"` \| `"huffmanOnly"` \| `"rle"` \| `"fixed"` | `"default"`   | Compression strategy    |

**Strategies:**

| Strategy        | Use case                                             |
| --------------- | ---------------------------------------------------- |
| `"default"`     | Balanced compression — the go-to for most data       |
| `"filtered"`    | Data with small variations (e.g., numeric sequences) |
| `"huffmanOnly"` | Data with little redundancy (skips string matching)  |
| `"rle"`         | Repetitive byte patterns                             |
| `"fixed"`       | Fixed Huffman coding (faster, less optimal)          |

### `decompress` / `tryDecompress`

Decompresses a tagged string produced by `compress`.

```typescript
import { compress, decompress } from "compress-kit";

const compressed = compress("Hello, World!".repeat(100));
const original = decompress(compressed); // "Hello, World!Hello, World!..."

// With max output size protection (1 MB limit)
const safe = decompress(compressed, { maxOutputSize: 1_048_576 });
```

**Options:** `inputEncoding` (default `"base64url"`), `windowBits` (`8`-`15`, default `15`), `maxOutputSize` (`0` or `undefined` = no limit).

### `compressObj` / `decompressObj` / `tryCompressObj` / `tryDecompressObj`

Compress and decompress plain objects (POJOs). Class instances, Maps, Sets, etc. are rejected.

```typescript
import { compressObj, decompressObj } from "compress-kit";

const compressed = compressObj({ users: ["Alice", "Bob"] });
const original = decompressObj<{ users: string[] }>(compressed);
console.log(original.users); // ["Alice", "Bob"]
```

Each function has a `try*` variant (`tryCompressObj`, `tryDecompressObj`).

## Output Format 📤

Compressed output is a **tagged string** with a suffix indicating how the data was stored:

| Suffix | Meaning                                                                      |
| ------ | ---------------------------------------------------------------------------- |
| `.0.`  | **Stored** — compression wasn't beneficial, original bytes are encoded as-is |
| `.1.`  | **Deflated** — DEFLATE compression was applied                               |

Decompression automatically detects the suffix and handles both cases. You never need to check the suffix manually.

## Decompression Safety 🛡️

Set `maxOutputSize` to protect against decompression bombs. When set, decompression uses streaming mode and aborts early if the cumulative output exceeds the byte limit.

```typescript
import { decompress } from "compress-kit";

// Limit decompressed output to 1 MB
const safe = decompress(compressed, { maxOutputSize: 1_048_576 });
```

- `maxOutputSize: 0` or `undefined` — no limit (default)
- `maxOutputSize: N` (positive integer) — abort if output exceeds N bytes

## The Result Pattern 🎯

Every throwing function has a `try*` variant that returns `Result<T>` instead of throwing.

```typescript
type Result<T> =
  | ({ success: true; error?: undefined } & T) // success — value fields spread in
  | { success: false; error: ErrorStruct }; // failure — error details

interface ErrorStruct {
  readonly message: string;
  readonly description: string;
}
```

```typescript
import { tryCompress } from "compress-kit";

const result = tryCompress("Hello, World!");

if (result.success) {
  console.log(result.result); // compressed string
} else {
  console.error(result.error.message, result.error.description);
}
```

## Type Exports 🏷️

```typescript
import type {
  CompressOptions,
  DecompressOptions,
  OneToNine,
  EightToFifteen,
  CompressEncoding,
  Result,
  ErrorStruct,
} from "compress-kit";
```

## Credits 🙏

Built on [`pako`](https://www.npmjs.com/package/pako) for the underlying DEFLATE compression and decompression.

## Contributions 🤝

- Open an [issue](https://github.com/WolfieLeader/npm/issues) or feature request
- Submit a PR to improve the package
- Star the repo if you find it useful

<div align="center">
<br/>

Crafted carefully by [WolfieLeader](https://github.com/WolfieLeader)

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

</div>
