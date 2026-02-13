<div align="center">
<img src="https://github.com/WolfieLeader/npm/blob/main/assets/cipher-kit-banner.svg" align="center" alt="banner" />

<h1 align="center">cipher-kit</h1>

<p align="center">
  Cross-platform cryptography for Node.js,<br/>
  browsers, Deno, Bun, and Cloudflare Workers.
</p>

<a href="https://opensource.org/licenses/MIT" rel="nofollow"><img src="https://img.shields.io/github/license/WolfieLeader/npm?color=DC343B" alt="License"></a>
<a href="https://www.npmjs.com/package/cipher-kit" rel="nofollow"><img src="https://img.shields.io/npm/v/cipher-kit?color=0078D4" alt="npm version"></a>
<a href="https://www.npmjs.com/package/cipher-kit" rel="nofollow"><img src="https://img.shields.io/npm/dt/cipher-kit.svg?color=03C03C" alt="npm downloads"></a>
<a href="https://github.com/WolfieLeader/npm" rel="nofollow"><img src="https://img.shields.io/github/stars/WolfieLeader/npm" alt="stars"></a>

</div>

## Highlights ✨

- **Zero runtime dependencies** — fully self-contained
- **AES-256-GCM encryption** with HKDF key derivation
- **PBKDF2 password hashing** with 320K iterations and constant-time verification
- **Type-safe API** with throwing and `Result<T>` variants for every operation
- **Tree-shakable** — import from `cipher-kit/node` or `cipher-kit/web-api`
- **Cross-platform** — Node.js, Deno, Bun, Cloudflare Workers, and all modern browsers

## Installation 📦

Requires Node.js >= 18.

```bash
npm install cipher-kit
# or
pnpm add cipher-kit
```

## Quick Start 🚀

```typescript
// Node.js (synchronous)
import { createSecretKey, encrypt, decrypt } from "cipher-kit/node";

const secretKey = createSecretKey("my-32-char-high-entropy-secret!!");
const encrypted = encrypt("Hello, World!", secretKey);
const decrypted = decrypt(encrypted, secretKey); // "Hello, World!"
```

```typescript
// Web / Deno / Bun / Cloudflare Workers (async)
import { createSecretKey, encrypt, decrypt } from "cipher-kit/web-api";

const secretKey = await createSecretKey("my-32-char-high-entropy-secret!!");
const encrypted = await encrypt("Hello, World!", secretKey);
const decrypted = await decrypt(encrypted, secretKey); // "Hello, World!"
```

## Imports 📥

Three import patterns are available:

```typescript
// 1. Root export — both kits via namespace objects
import { nodeKit, webKit } from "cipher-kit";
nodeKit.encrypt("data", key);
await webKit.encrypt("data", key);

// 2. Direct Node.js import (synchronous API)
import { createSecretKey, encrypt, decrypt } from "cipher-kit/node";

// 3. Direct Web Crypto import (async API)
import { createSecretKey, encrypt, decrypt } from "cipher-kit/web-api";
```

The root export also re-exports shared utilities: `stringifyObj`, `tryStringifyObj`, `parseToObj`, `tryParseToObj`, `ENCRYPTED_REGEX`, `matchEncryptedPattern`, and all types. All entry points expose the same utilities.

## API Reference 📖

### `createSecretKey` / `tryCreateSecretKey`

Derives a secret key from a high-entropy secret using HKDF.

```typescript
import { createSecretKey, tryCreateSecretKey } from "cipher-kit/node";

// Default — AES-256-GCM with SHA-256 HKDF
const secretKey = createSecretKey("my-32-char-high-entropy-secret!!");

// Custom options
const customKey = createSecretKey("my-32-char-high-entropy-secret!!", {
  algorithm: "aes128gcm",
  digest: "sha512",
  salt: "my-unique-app-salt",
});

// Safe variant — returns Result<T> instead of throwing
const result = tryCreateSecretKey("my-32-char-high-entropy-secret!!");
if (result.success) {
  console.log(result.result); // the derived NodeSecretKey / WebSecretKey
}
```

**Options:**

| Option        | Type                                            | Default        | Description                                        |
| ------------- | ----------------------------------------------- | -------------- | -------------------------------------------------- |
| `algorithm`   | `"aes256gcm"` \| `"aes192gcm"` \| `"aes128gcm"` | `"aes256gcm"`  | Encryption algorithm                               |
| `digest`      | `"sha256"` \| `"sha384"` \| `"sha512"`          | `"sha256"`     | HKDF digest algorithm                              |
| `salt`        | `string`                                        | `"cipher-kit"` | HKDF salt (min 8 chars)                            |
| `info`        | `string`                                        | `"cipher-kit"` | HKDF context info                                  |
| `extractable` | `boolean`                                       | `false`        | Web CryptoKey extractable flag (no effect on Node) |

> **Security:** HKDF is a key _expansion_ function — it does not provide brute-force resistance. The `secret` must be high-entropy (e.g., a 256-bit random key). For human-chosen passwords, use `hashPassword` instead.
>
> The default `salt` is `"cipher-kit"`. Two deployments using the same secret and default salt will derive identical keys. For isolation between environments, provide a unique `salt` per deployment (e.g., `salt: "prod-us-east-1"`).

### `encrypt` / `decrypt` / `tryEncrypt` / `tryDecrypt`

Encrypts and decrypts UTF-8 strings using the provided secret key. Output encoding defaults to `base64url`; pass `{ outputEncoding: "hex" }` or `"base64"` to change it.

```typescript
import { createSecretKey, encrypt, decrypt, tryEncrypt } from "cipher-kit/node";

const secretKey = createSecretKey("my-32-char-high-entropy-secret!!");

const encrypted = encrypt("Hello, World!", secretKey);
const decrypted = decrypt(encrypted, secretKey); // "Hello, World!"

// Hex encoding
const hex = encrypt("Hello, World!", secretKey, { outputEncoding: "hex" });
decrypt(hex, secretKey, { inputEncoding: "hex" }); // "Hello, World!"

// Safe variant
const result = tryEncrypt("Hello, World!", secretKey);
if (result.success) {
  console.log(result.result); // encrypted string
}
```

> **Wire format:** Both platforms output `iv.cipher.tag.` (3 dot-separated segments with trailing dot). The format is **cross-platform compatible** — data encrypted on Node can be decrypted on Web and vice versa.

### `encryptObj` / `decryptObj` / `tryEncryptObj` / `tryDecryptObj`

Encrypts and decrypts plain objects (POJOs). Class instances, Maps, Sets, etc. are rejected.

```typescript
import { createSecretKey, encryptObj, decryptObj } from "cipher-kit/node";

const key = createSecretKey("my-32-char-high-entropy-secret!!");

const encrypted = encryptObj({ user: "Alice", role: "admin" }, key);
const obj = decryptObj<{ user: string; role: string }>(encrypted, key);
console.log(obj.user); // "Alice"
```

### `hash` / `tryHash`

Hashes a UTF-8 string using the specified digest algorithm. Not suitable for passwords — use `hashPassword` instead.

```typescript
import { hash } from "cipher-kit/node";

const hashed = hash("Hello, World!"); // SHA-256, base64url

const hexHash = hash("Hello, World!", { digest: "sha512", outputEncoding: "hex" });
```

**Options:** `digest` (`"sha256"` | `"sha384"` | `"sha512"`, default `"sha256"`), `outputEncoding` (`"base64url"` | `"base64"` | `"hex"`, default `"base64url"`).

### `hashPassword` / `tryHashPassword` / `verifyPassword` / `tryVerifyPassword`

Hashes passwords using PBKDF2 (320K iterations by default) with constant-time verification.

```typescript
import { hashPassword, verifyPassword } from "cipher-kit/node";

const { result, salt } = hashPassword("user-password");
// Store result and salt in your database

verifyPassword("user-password", result, salt); // true
verifyPassword("wrong-password", result, salt); // false

// Custom options
const custom = hashPassword("user-password", {
  digest: "sha256",
  iterations: 500_000,
  saltLength: 32,
});
```

**`hashPassword` options:** `digest` (default `"sha512"`), `outputEncoding` (default `"base64url"`), `saltLength` (default `16`, min `8`), `iterations` (default `320000`, min `100000`), `keyLength` (default `64`, min `16`).

**`verifyPassword` options:** `digest` (default `"sha512"`), `inputEncoding` (default `"base64url"`), `iterations` (default `320000`), `keyLength` (default `64`). Must match the values used during hashing.

> **Note:** Node uses `crypto.timingSafeEqual` for constant-time comparison. The Web implementation uses a best-effort full-loop XOR pattern since the Web Crypto API does not expose a `timingSafeEqual` equivalent.
>
> **Unicode normalization:** All secret and password inputs are NFKC-normalized before processing. This means that equivalent Unicode representations (e.g., `"café"` composed vs. decomposed) produce identical keys and hashes. This is the recommended approach per NIST SP 800-63B.

### `generateUuid` / `tryGenerateUuid`

Generates a cryptographically random UUID (v4). Synchronous on both platforms.

```typescript
import { generateUuid } from "cipher-kit/node";

const id = generateUuid(); // "550e8400-e29b-41d4-a716-446655440000"
```

### Encoding Utilities

Convert between strings and bytes, or re-encode between formats. Synchronous on both platforms.

```typescript
import { convertStrToBytes, convertBytesToStr, convertEncoding } from "cipher-kit/node";

const bytes = convertStrToBytes("Hello", "utf8");
const str = convertBytesToStr(bytes, "base64url"); // "SGVsbG8"
const hex = convertEncoding("SGVsbG8", "base64url", "hex"); // "48656c6c6f"
```

Supported encodings: `"utf8"`, `"base64"`, `"base64url"`, `"hex"`, `"latin1"`. Each function has a `try*` variant returning `Result<T>`.

### Object Utilities

Serialize and parse plain objects with strict validation. Available from the root export and both platform entry points.

```typescript
import { stringifyObj, parseToObj } from "cipher-kit";

const json = stringifyObj({ name: "Alice", role: "admin" });
const obj = parseToObj<{ name: string; role: string }>(json);
console.log(obj.name); // "Alice"
```

Each function has a `try*` variant (`tryStringifyObj`, `tryParseToObj`).

### Type Guards

```typescript
import { isNodeSecretKey } from "cipher-kit/node";
import { isWebSecretKey } from "cipher-kit/web-api";

isNodeSecretKey(key); // true if key is NodeSecretKey
isWebSecretKey(key); // true if key is WebSecretKey
```

### Regex Utilities

Validate the structural shape of encrypted payloads before decryption.

```typescript
import { ENCRYPTED_REGEX, matchEncryptedPattern } from "cipher-kit";

matchEncryptedPattern("abc.def.ghi."); // true  — iv.cipher.tag.
matchEncryptedPattern("abc.def."); // false — missing tag segment
```

`ENCRYPTED_REGEX` exposes the underlying regex: `/^([A-Za-z0-9+/_-][A-Za-z0-9+/=_-]*)\.([A-Za-z0-9+/_-][A-Za-z0-9+/=_-]*)\.([A-Za-z0-9+/_-][A-Za-z0-9+/=_-]*)\.$/`.

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
import { tryEncrypt } from "cipher-kit/node";

const result = tryEncrypt("Hello", secretKey);

if (result.success) {
  console.log(result.result); // encrypted string
} else {
  console.error(result.error.message, result.error.description);
}
```

## Type Exports 🏷️

All types are importable from any entry point:

```typescript
import type {
  NodeSecretKey,
  WebSecretKey,
  CreateSecretKeyOptions,
  EncryptOptions,
  DecryptOptions,
  HashOptions,
  HashPasswordOptions,
  VerifyPasswordOptions,
  CipherEncoding,
  Encoding,
  EncryptionAlgorithm,
  DigestAlgorithm,
  Result,
  ErrorStruct,
} from "cipher-kit";
```

## Contributions 🤝

- Open an [issue](https://github.com/WolfieLeader/npm/issues) or feature request
- Submit a PR to improve the package
- Star the repo if you find it useful

<div align="center">
<br/>

Crafted carefully by [WolfieLeader](https://github.com/WolfieLeader)

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

</div>
