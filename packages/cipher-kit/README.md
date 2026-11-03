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
- **HMAC signing and verification** that matches webhook signatures, with the MAC length set by your options
- **Random tokens, numeric codes, and UUIDs** (v4 and sortable v7)
- **Type-safe API** with throwing and `Result<T>` variants for every operation
- **Tree-shakable** — import from `cipher-kit/node` or `cipher-kit/web-api`
- **Cross-platform** — Node.js, Deno, Bun, Cloudflare Workers, and all modern browsers

## Installation 📦

Requires Node.js 20.19 or later. Tested on Node.js 20.19 to 26, Bun, Deno 2, and Cloudflare Workers (with and without `nodejs_compat`).
Deployed Workers reject PBKDF2 above 100,000 iterations, so pass `iterations: 100_000` to `hashPassword` and `verifyPassword` there.
On Deno, the Node kit has no AES-192-GCM, because Deno's `node:crypto` lacks it. The Web kit supports it everywhere.
See the [changelog](https://github.com/WolfieLeader/npm/blob/main/packages/cipher-kit/CHANGELOG.md) for what changed in each version.

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
| `info`        | `string`                                        | `"cipher-kit"` | HKDF context info (max 1024 UTF-8 bytes)           |
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
>
> **Nonce exhaustion:** AES-GCM uses random 96-bit IVs. Rotate keys before ~2^32 encryptions with the same key to avoid nonce collision.
>
> **Input rules:** `encrypt` accepts any non-empty string, including whitespace-only strings. It rejects `""` and strings with lone UTF-16 surrogates. `decrypt` fails if the plaintext is not valid UTF-8.

#### Additional data

Pass `additionalData` to bind a ciphertext to its context, such as the ID of the record or user it belongs to. `decrypt` fails unless it gets the same value, so a ciphertext copied into another record does not decrypt there.

```typescript
const encrypted = encrypt("123-45-6789", secretKey, { additionalData: `user:${userId}` });

decrypt(encrypted, secretKey, { additionalData: `user:${userId}` }); // "123-45-6789"
decrypt(encrypted, secretKey, { additionalData: `user:${otherUserId}` }); // throws
decrypt(encrypted, secretKey); // throws
```

- It is authenticated (AES-GCM additional data) but not encrypted, and not stored in the ciphertext. Store or derive it yourself.
- It is a string (encoded as UTF-8, not normalized) or a `Uint8Array`, at most 65,536 bytes. A string and its UTF-8 bytes are the same value.
- An empty string or empty `Uint8Array` is the same as omitting it.
- `encryptObj` and `decryptObj` take it too.

### `encryptObj` / `decryptObj` / `tryEncryptObj` / `tryDecryptObj`

Encrypts and decrypts plain objects (POJOs). Class instances, Maps, Sets, etc. are rejected. Objects may contain at most 100,000 objects and arrays combined; both `encryptObj` and `decryptObj` enforce this limit.

```typescript
import { createSecretKey, encryptObj, decryptObj } from "cipher-kit/node";

const key = createSecretKey("my-32-char-high-entropy-secret!!");

const encrypted = encryptObj({ user: "Alice", role: "admin" }, key);
const obj = decryptObj<{ user: string; role: string }>(encrypted, key);
console.log(obj.user); // "Alice"
```

### `hash` / `tryHash`

Hashes a UTF-8 string using the specified digest algorithm. Any well-formed string is accepted, including `""`. Not suitable for passwords — use `hashPassword` instead.

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

> **Cloudflare Workers:** deployed Workers reject PBKDF2 above 100,000 iterations, in both kits. Pass `iterations: 100_000` to `hashPassword` and `verifyPassword`. Local workerd does not enforce it.

> **Note:** Node uses `crypto.timingSafeEqual` for constant-time comparison. The Web implementation uses a best-effort full-loop XOR pattern since the Web Crypto API does not expose a `timingSafeEqual` equivalent.
>
> **Unicode normalization:** All secret and password inputs are NFKC-normalized before processing. This means that equivalent Unicode representations (e.g., `"café"` composed vs. decomposed) produce identical keys and hashes. This is the recommended approach per NIST SP 800-63B.

### `hmac` / `verifyHmac` / `tryHmac` / `tryVerifyHmac`

Computes and verifies an HMAC (RFC 2104) with SHA-256, SHA-384 or SHA-512. `data` and `key` are strings (used as UTF-8) or `Uint8Array` bytes. The key is used as given, with no normalization or key derivation, so the MAC matches webhook signatures and any other HMAC implementation given the same key. An empty key is rejected.

```typescript
import { hmac, verifyHmac } from "cipher-kit/node";

const mac = hmac("message", "my-signing-key"); // HMAC-SHA-256, base64url
verifyHmac("message", mac, "my-signing-key"); // true
verifyHmac("tampered", mac, "my-signing-key"); // false

// Check a webhook signature sent as hex
const valid = verifyHmac(rawBody, signatureHex, signingSecret, { inputEncoding: "hex" });

// A truncated MAC: verify with the same length
const short = hmac("message", "my-signing-key", { length: 16 });
verifyHmac("message", short, "my-signing-key", { length: 16 }); // true
```

**`hmac` options:** `digest` (default `"sha256"`), `outputEncoding` (default `"base64url"`), `length` in bytes (default: the full digest, 32 / 48 / 64; min `8`).

**`verifyHmac` options:** `digest` (default `"sha256"`), `inputEncoding` (default `"base64url"`), `length` (default: the full digest). Must match the values used to compute the MAC.

> **Security:** `verifyHmac` expects exactly `length` bytes, taken from your options. A presented MAC that does not decode, or decodes to any other length, returns `false`, so a forger cannot pass a 1-byte tag. Node compares with `crypto.timingSafeEqual`; Web uses a best-effort full-loop XOR compare. HMAC adds no brute-force resistance, so use a high-entropy key.

### `randomToken` / `randomCode` / `tryRandomToken` / `tryRandomCode`

Generates random strings from the platform's cryptographically secure generator. Synchronous on both platforms.

```typescript
import { randomCode, randomToken } from "cipher-kit/node";

randomToken(); // 32 random bytes as 43 base64url characters
randomToken(16, "hex"); // 32 hex characters
randomCode(); // "042917": 6 digits, leading zeros kept
randomCode(8); // "90314276"
```

- `randomToken(bytes = 32, encoding = "base64url")`: `bytes` is an integer from 8 to 1024; `encoding` is `"base64url"`, `"base64"` or `"hex"`.
- `randomCode(digits = 6)`: `digits` is an integer from 4 to 9. Every code is equally likely: a random value that would bias the result is redrawn, not reduced with modulo. Pair one-time codes with expiry and attempt limits.

### `generateUuid` / `tryGenerateUuid`

Generates a UUID. Synchronous on both platforms.

```typescript
import { generateUuid } from "cipher-kit/node";

const id = generateUuid(); // v4: "550e8400-e29b-41d4-a716-446655440000"
const sortable = generateUuid({ version: 7 }); // v7: "019a4b0e-3f2c-7d1a-9b3e-5c2f8a6d4e10"
```

- **Version 4** (default) is fully random.
- **Version 7** (RFC 9562) starts with the Unix time in milliseconds, then 74 random bits. UUIDs from different milliseconds sort by creation time as strings. UUIDs from the same millisecond are not guaranteed to sort in creation order. A v7 UUID reveals when it was made.

### Encoding Utilities

Convert between strings and bytes, or re-encode between formats. Synchronous on both platforms.

```typescript
import { convertStrToBytes, convertBytesToStr, convertEncoding } from "cipher-kit/node";

const bytes = convertStrToBytes("Hello", "utf8");
const str = convertBytesToStr(bytes, "base64url"); // "SGVsbG8"
const hex = convertEncoding("SGVsbG8", "base64url", "hex"); // "48656c6c6f"
```

Supported encodings: `"utf8"`, `"base64"`, `"base64url"`, `"hex"`, `"latin1"`. Each function has a `try*` variant returning `Result<T>`.

Decoding is strict and identical on Node and Web:

- `base64` must be canonical, with exact padding (`"AA=="` decodes; `"AB=="` and `"AA"` are rejected).
- `base64url` padding is optional, but must be exact when present (`"YQ"` and `"YQ=="` decode; `"YQ="` is rejected).
- `latin1` accepts only code points up to 255.
- `utf8` rejects lone UTF-16 surrogates when encoding, and invalid UTF-8 bytes when decoding (no U+FFFD substitution).

### Object Utilities

Serialize and parse plain objects with strict validation. Available from the root export and both platform entry points.

```typescript
import { stringifyObj, parseToObj } from "cipher-kit";

const json = stringifyObj({ name: "Alice", role: "admin" });
const obj = parseToObj<{ name: string; role: string }>(json);
console.log(obj.name); // "Alice"
```

Each function has a `try*` variant (`tryStringifyObj`, `tryParseToObj`). Both sides accept at most 100,000 objects and arrays combined.

### Type Guards

```typescript
import { isNodeSecretKey } from "cipher-kit/node";
import { isWebSecretKey } from "cipher-kit/web-api";

isNodeSecretKey(key); // true if key is NodeSecretKey
isWebSecretKey(key); // true if key is WebSecretKey
```

### Regex Utilities

Validate the structural shape of encrypted payloads before decryption. This is a **structural** check only — it validates the dot-separated format but does not verify whether individual segments contain valid base64, base64url, or hex encoding.

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
  HmacOptions,
  VerifyHmacOptions,
  GenerateUuidOptions,
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
