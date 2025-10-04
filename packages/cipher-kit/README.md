<div align="center">
<img src="https://github.com/WolfieLeader/npm/blob/main/assets/cipher-kit-banner.svg" align="center" alt="banner" />

<h1 align="center" style="font-weight:900;">cipher-kit</h1>

<p align="center">
  Secure, Modern, and Cross-Platform <br/>
  Cryptography Helpers for Web, Node.js, <br/> 
  Deno, Bun, and Cloudflare Workers
</p>

<a href="https://opensource.org/licenses/MIT" rel="nofollow"><img src="https://img.shields.io/github/license/WolfieLeader/npm?color=DC343B" alt="License"></a>
<a href="https://www.npmjs.com/package/cipher-kit" rel="nofollow"><img src="https://img.shields.io/npm/v/cipher-kit?color=0078D4" alt="npm version"></a>
<a href="https://www.npmjs.com/package/cipher-kit" rel="nofollow"><img src="https://img.shields.io/npm/dt/cipher-kit.svg?color=03C03C" alt="npm downloads"></a>
<a href="https://github.com/WolfieLeader/npm" rel="nofollow"><img src="https://img.shields.io/github/stars/WolfieLeader/npm" alt="stars"></a>

</div>

## Why `cipher-kit`? 🤔

- 🛡️ **Secure and Flexible** - Uses best practices and modern cryptographic techniques, while providing a flexible and simple API.
- 📦 **All-in-One Toolkit** – Combines encryption, hashing, encoding, serialization, and more into a single package.
- 🌐 **Cross-Platform** – Works seamlessly across Web, Node.js, Deno, Bun, and Cloudflare Workers.
- 💡 **Typed and Ergonomic** - Type-safe API with both throwing and non-throwing (`Result`) flavors.
- 🌳 **Tree-Shakable** - Import from the root or from platform-specific entry points to keep bundles lean.
- 🚫 **Zero Dependencies** – Fully self-contained, no external libraries required.
- 🍼 **Explain Like I'm Five** - Newbie-friendly explanations and documentation.

## Installation 🔥

```bash
npm install cipher-kit@latest
# or
yarn add cipher-kit@latest
# or
pnpm install cipher-kit@latest
# or
bun add cipher-kit@latest
```

## Quick Start 🚀

```typescript
// Node.js
import { createSecretKey, encrypt, decrypt } from "cipher-kit/node";

const secretKey = createSecretKey("my-passphrase");
const encrypted = encrypt("Hello World!", secretKey);
const decrypted = decrypt(encrypted, secretKey);
console.log(decrypted); // "Hello World!"

// Web - including Deno, Bun, Cloudflare Workers
import { createSecretKey, encrypt, decrypt } from "cipher-kit/web-api";

const secretKey = await createSecretKey("my-passphrase");
const encrypted = await encrypt("Hello World!", secretKey);
const decrypted = await decrypt(encrypted, secretKey);
console.log(decrypted); // "Hello World!"
```

## Usage 🪛

Table of Contents:

- [webKit and nodeKit](#webkit-and-nodekit-objects-)
- [The try Prefix](#the-try-prefix-non-throwing-result-api-)
- [Encryption & Decryption](#encryption--decryption-)
  - [Secret Key Creation](#secret-key-creation-)
  - [Encrypting Data](#encrypting-data-)
  - [Decrypting Data](#decrypting-data-)
  - [Encrypting & Decrypting Objects](#encrypting--decrypting-objects-)
- [Hashing](#hashing-)
- [UUID Generation](#uuid-generation-)
- [Password Hashing & Verification](#password-hashing--verification-)
- [Encoding & Decoding](#encoding--decoding-)
- [Object Serialization & Deserialization](#object-serialization--deserialization-)
- [Regex Utilities](#regex-utilities-)

### `webKit` and `nodeKit` Objects 📦

The `webKit` and `nodeKit` objects provide platform-specific implementations for Web (including Deno, Bun, and Cloudflare Workers) and Node.js environments, respectively.

You can also import them directly from `cipher-kit/web-api` and `cipher-kit/node` for smaller bundle sizes.

```typescript
// Option A: import helpers directly
import { isNodeSecretKey } from "cipher-kit/node";
import { isWebSecretKey } from "cipher-kit/web-api";

function isSecretKey(key: unknown): boolean {
  return isNodeSecretKey(key) || isWebSecretKey(key);
}

// Option B: via kits from the root export
import { webKit, nodeKit } from "cipher-kit";

function isSecretKey(key: unknown): boolean {
  return nodeKit.isNodeSecretKey(key) || webKit.isWebSecretKey(key);
}
```

### The `try` Prefix (Non-Throwing `Result` API) 🤔

The `try` prefix functions return a `Result<T>` object that indicates success or failure without throwing exceptions.

This is useful in scenarios where you want to handle errors gracefully without using `try/catch` blocks.

```typescript
// Throwing version - simpler but requires try/catch
const msg = encrypt("Secret message", secretKey);
console.log(`Encrypted message: ${msg}`);

// Non-throwing version - returns a Result<T> object
const msg = tryEncrypt("Secret message", secretKey);

// Either check for success status
if (msg.success) console.log(`Encrypted message: ${msg.result}`);
else console.error(`${msg.error.message} - ${msg.error.description}`);

// Or Check that there is no error
if (!msg.error) console.log(`Encrypted message: ${msg.result}`);
else console.error(`${msg.error.message} - ${msg.error.description}`);
```

### Encryption & Decryption 🤫

Encryption is the process of converting readable plaintext into unreadable ciphertext using an algorithm and a secret key to protect its confidentiality. Decryption is the reverse process, using the same algorithm and the correct key to convert the ciphertext back into its original, readable plaintext form.

#### _Secret Key Creation_ 🔑

Before encrypting or decrypting data, you need to create a secret key.
The key must be at least 8 characters long.

Each key is tied to a specific platform (Web or Node.js) and cannot be used interchangeably.

```typescript
// Node.js example
import { createSecretKey } from "cipher-kit/node";

const nodeSecretKey = createSecretKey("my-passphrase");

// Web example
import { createSecretKey } from "cipher-kit/web-api";

const webSecretKey = await createSecretKey("my-passphrase");
```

The function accepts an optional `options` as well, which allows you to customize the key derivation process.

```typescript
interface CreateSecretKeyOptions {
  // Which encryption algorithm to use (default: "aes256gcm")
  algorithm?: "aes256gcm" | "aes192gcm" | "aes128gcm";

  // Digest algorithm for HKDF (key derivation) (default: "sha256")
  digest?: "sha256" | "sha384" | "sha512";

  // Optional salt for HKDF (key derivation), if you provide a random one it will return a different key each time (default: "cipher-kit-salt", must be >= 8 characters).
  salt?: string;

  // Optional context info for HKDF (default: "cipher-kit").
  info?: string;
}
```

#### _Encrypting Data_ 🔐

Ciphertext formats differ between Web and Node.js platforms.

- Node.js - `iv.cipher.tag.` (3 parts)
- Web - `iv.cipherWithTag.` (2 parts)

```typescript
// Node.js example
import { encrypt } from "cipher-kit/node";

const encrypted = encrypt("Hello, World!", nodeSecretKey);
console.log(`Encrypted: ${encrypted}`);

// Web example
import { encrypt } from "cipher-kit/web-api";

const encrypted = await encrypt("Hello, World!", webSecretKey);
console.log(`Encrypted: ${encrypted}`);
```

The function accepts an optional `options` parameter to customize the output encoding.

```typescript
interface EncryptOptions {
  // Output ciphertext encoding(default: "base64url")
  encoding?: "base64url" | "base64" | "hex";
}
```

#### _Decrypting Data_ 🔓

Since ciphertext formats differ between Web and Node.js platforms, make sure to use the correct `decrypt` function for the platform where the data was encrypted.

```typescript
// Node.js example
import { decrypt } from "cipher-kit/node";

const decrypted = decrypt(encrypted, nodeSecretKey);
console.log(`Decrypted: ${decrypted}`);

// Web example
import { decrypt } from "cipher-kit/web-api";

const decrypted = await decrypt(encrypted, webSecretKey);
console.log(`Decrypted: ${decrypted}`);
```

The function accepts an optional `options` parameter to specify the input encoding.

Make sure to use the same encoding that was used during encryption.

```typescript
interface DecryptOptions {
  // Input ciphertext encoding (default: "base64url")
  encoding?: "base64url" | "base64" | "hex";
}
```

#### _Encrypting & Decrypting Objects_ 🧬

```typescript
// Node.js example
import { encryptObj, decryptObj } from "cipher-kit/node";

const obj = { name: "Alice", age: 30, city: "Wonderland" };

const encryptedObj = encryptObj(obj, nodeSecretKey);

const decryptedObj = decryptObj<typeof obj>(encryptedObj, nodeSecretKey);
console.log(`Decrypted Object:`, decryptedObj);

// Web example
import { encryptObj, decryptObj } from "cipher-kit/web-api";

const obj = { name: "Alice", age: 30, city: "Wonderland" };

const encryptedObj = await encryptObj(obj, webSecretKey);

const decryptedObj = await decryptObj<typeof obj>(encryptedObj, webSecretKey);
console.log(`Decrypted Object:`, decryptedObj);
```

The `encryptObj` and `decryptObj` functions accept the same `options` parameters as `encrypt` and `decrypt`, respectively.

### Hashing 🪄

Hashing is a one-way process that uses an algorithm to transform data of any size into a fixed-length string of characters, called a hash value or digest. It serves as a digital fingerprint for the data, enabling quick data retrieval in hash tables, password storage, and file integrity checks. Key features include its irreversibility (you can't get the original data back from the hash).

Not suitable for storing passwords - use `hashPassword` instead.

```typescript
// Node.js example
import { hash } from "cipher-kit/node";

const hashed = hash("Hello, World!");
console.log(`Hashed: ${hashed}`);

// Web example
import { hash } from "cipher-kit/web-api";

const hashed = await hash("Hello, World!");
console.log(`Hashed: ${hashed}`);
```

The function accepts an optional `options` parameter to customize the hashing process.

```typescript
interface HashOptions {
  // Digest algorithm to use (default: "sha256").
  digest?: "sha256" | "sha384" | "sha512";

  // Output encoding (default: "base64url").
  encoding?: "base64url" | "base64" | "hex";
}
```

### UUID Generation 🪪

UUID (Universally Unique Identifier) is a 128-bit identifier used to uniquely identify information in computer systems. It is designed to be globally unique, meaning that no two UUIDs should be the same, even if generated on different systems or at different times. UUIDs are commonly used in databases, distributed systems, and applications where unique identification is crucial.

```typescript
// Node.js example
import { generateUuid } from "cipher-kit/node";

const uuid = generateUuid();
console.log(`Generated UUID: ${uuid}`);

// Web example
import { generateUuid } from "cipher-kit/web-api";

const uuid = generateUuid();
console.log(`Generated UUID: ${uuid}`);
```

### Password Hashing & Verification 💎

Password hashing is a one-way process that transforms a plaintext password into a fixed-length hash. Password hashing is crucial for securely storing passwords in databases, as it protects user credentials from being exposed in case of a data breach.

Password hashing is different from general-purpose hashing because it often involves additional techniques like salting and key stretching to enhance security against brute-force attacks, and it's usually slower to compute to make rainbow table attacks less feasible.

To verify a password, the same hashing process is applied to the input password, and the resulting hash is compared to the stored hash, in a constant-time comparison to prevent timing attacks.

```typescript
// Node.js example
import { hashPassword, verifyPassword } from "cipher-kit/node";

const { hash, salt } = hashPassword("some-secure-password");
console.log(`Hashed Password: ${hash}`);

const isMatch = verifyPassword("some-secure-password", hash, salt);
console.log(`Password match: ${isMatch}`);

// Web example
import { hashPassword, verifyPassword } from "cipher-kit/web-api";

const { hash, salt } = await hashPassword("some-secure-password");
console.log(`Hashed Password: ${hash}`);

const isMatch = await verifyPassword("some-secure-password", hash, salt);
console.log(`Password match: ${isMatch}`);
```

The `hashPassword` and `verifyPassword` functions accept an optional `options` parameter to customize the hashing process.

```typescript
interface HashPasswordOptions {
  // Digest algorithm to use (default: "sha512").
  digest?: "sha256" | "sha384" | "sha512";

  // Encoding format for the output hash (default: "base64url").
  encoding?: "base64url" | "base64" | "hex";

  // Length of the salt in bytes (default: 16 bytes, min: 8 bytes).
  saltLength?: number;

  // Number of iterations for key derivation (default: 320000, min: 1000).
  iterations?: number;

  // Length of the derived key in bytes (default: 64 bytes, min: 16 bytes).
  keyLength?: number;
}

interface VerifyPasswordOptions {
  // Digest algorithm used during the original hashing (default: `'sha512'`).
  digest?: "sha256" | "sha384" | "sha512";

  // Encoding format used during the original hashing (default: `'base64url'`).
  encoding?: "base64url" | "base64" | "hex";

  // Number of iterations used during the original hashing (default: `320000`).
  iterations?: number;

  // Length of the key used during the original hashing (default: `64`).
  keyLength?: number;
}
```

### Encoding & Decoding 🧩

Encoding and decoding are processes used to convert data into a specific format for efficient transmission, storage, or representation. Encoding transforms data into a different format using a specific scheme, while decoding reverses this process to retrieve the original data. Common encoding schemes include Base64, Base64URL, and Hexadecimal (Hex).

```typescript
// Node.js and Web example - works the same in both
import { convertStrToBytes, convertBytesToStr, convertEncoding } from "cipher-kit/node"; // or "cipher-kit/web-api"

// Encoding
const buffer = convertStrToBytes("Hello World!", "utf8"); // the input encoding
console.log(`Encoded: ${buffer}`);

// Decoding
const str = convertBytesToStr(buffer, "utf8"); // the output encoding
console.log(`Decoded: ${str}`);

// Convert between encodings
const base64 = convertEncoding("Hello World!", "utf8", "base64");
console.log(`Base64: ${base64}`);
```

### Object Serialization & Deserialization 🧬

Object serialization in JavaScript is the process of converting objects or arrays into a JSON string representation, that can be easily stored or transmitted. Deserialization is the reverse process, where the JSON string is parsed back into its original object or array structure.

```typescript
import { stringifyObj, parseToObj } from "cipher-kit"; // works in both "cipher-kit/web-api" and "cipher-kit/node"

const obj = { name: "Alice", age: 30, city: "Wonderland" };

const jsonString = stringifyObj(obj);
console.log(`Serialized: ${jsonString}`);

const parsedObj = parseToObj<typeof obj>(jsonString);
console.log(`Deserialized:`, parsedObj);
```

### Regex Utilities 🔍

Regular expressions (regex) are sequences of characters that form search patterns, used for pattern matching within strings.

Before decrypting, you can validate the format (decryption functions already validate internally).

```typescript
import { ENCRYPTED_REGEX, matchEncryptedPattern } from "cipher-kit"; // works in both "cipher-kit/web-api" and "cipher-kit/node"

function isEncryptedFormat(message: string): boolean {
  return matchEncryptedPattern(message, "general"); // or "node" or "web"
}

// or

function isEncryptedFormat(message: string): boolean {
  return ENCRYPTED_REGEX.general.test(message); // or "node" or "web"
}
```

## Contributions 🤝

Want to contribute or suggest a feature?

- Open an issue or feature request
- Submit a PR to improve the packages or add new ones
- Star ⭐ the repo if you like what you see

<div align="center">
<br/>
<div style="font-size: 14px; font-weight:bold;"> ⚒️ Crafted carefully by <a href="https://github.com/WolfieLeader" target="_blank" rel="nofollow">WolfieLeader</a></div>
<p style="font-size: 12px; font-style: italic;">This project is licensed under the <a href="https://opensource.org/licenses/MIT" target="_blank" rel="nofollow">MIT License</a>.</p>
<div style="font-size: 12px; font-style: italic; font-weight: 600;">Thank you!</div>
</div>
