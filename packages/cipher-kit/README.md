<div align="center">
<img src="https://github.com/WolfieLeader/npm/blob/main/assets/cipher-kit-banner.svg" align="center" alt="banner" />

<h1 align="center" style="font-weight:900;">cipher-kit</h1>

<!-- TODO -->
<p align="center">
  Secure, Lightweight, and Cross-Platform <br/>
  Encryption, Decryption, and Hashing <br/> 
  for Web, Node.js, Deno, Bun, and Cloudflare Workers
</p>

<a href="https://opensource.org/licenses/MIT" rel="nofollow"><img src="https://img.shields.io/github/license/WolfieLeader/npm?color=DC343B" alt="License"></a>
<a href="https://www.npmjs.com/package/cipher-kit" rel="nofollow"><img src="https://img.shields.io/npm/v/cipher-kit?color=0078D4" alt="npm version"></a>
<a href="https://www.npmjs.com/package/cipher-kit" rel="nofollow"><img src="https://img.shields.io/npm/dy/cipher-kit.svg?color=03C03C" alt="npm downloads"></a>
<a href="https://github.com/WolfieLeader/npm" rel="nofollow"><img src="https://img.shields.io/github/stars/WolfieLeader/npm" alt="stars"></a>

</div>

## Why `cipher-kit`? 🤔

- 🛡️ **Secure and Flexible** - Uses best practices and modern cryptographic techniques, while providing a flexible and simple API.
- 📦 **All-in-One Toolkit** – Combines encryption, hashing, encoding, serialization, and more into a single package.
- 🌐 **Cross-Platform** – Works seamlessly across Web, Node.js, Deno, Bun, and Cloudflare Workers.
- 💡 **Typed and Ergonomic** - Type safe and provides throwing and non-throwing (`Result`) APIs.
- 🌳 **Tree-Shakable** - import root or platform-specific modules to reduce bundle size.
- 🚫 **Zero Dependencies** – Fully self-contained, no external libraries required.
- 🍼 **Explain like I'm five** - Newbie-friendly explanations and documentation.

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

## Usage 🪛

### The `try` Prefix (Non-Throwing `Result` API)

The `try` prefix functions return a `Result<T>` object that indicates success or failure without throwing exceptions.

This is useful in scenarios where you want to handle errors gracefully without using `try/catch` blocks.

```typescript
// Throwing version - simpler but requires try/catch
const message = encrypt('Secret message', secretKey);
console.log(`Encrypted message: ${message}`);

// Non-throwing version - returns a Result<T> object
const message = tryEncrypt('Secret message', secretKey);
if (message.success) {
  console.log(`Encrypted message: ${message.result}`);
} else {
  console.error(`Encryption failed: ${message.error.message} - ${message.error.description}`);
}
```

### The `webKit` and `nodeKit` Objects

The `webKit` and `nodeKit` objects provide platform-specific implementations for Web (including Deno, Bun, and Cloudflare Workers) and Node.js environments, respectively.

You can also import them directly from `cipher-kit/web-api` and `cipher-kit/node` for smaller bundle sizes.

```typescript
import { webKit, nodeKit } from 'cipher-kit';
import { isNodeSecretKey } from 'cipher-kit/node';
import { isWebSecretKey } from 'cipher-kit/web-api';

// These are the same:
function isSecretKey(key: unknown): boolean {
  return isNodeSecretKey(key) || isWebSecretKey(key);
}

function isSecretKey(key: unknown): boolean {
  return nodeKit.isNodeSecretKey(key) || webKit.isWebSecretKey(key);
}
```

### Encryption and Decryption

Encryption is the process of converting readable plaintext into unreadable ciphertext using an algorithm and a secret key to protect its confidentiality. Decryption is the reverse process, using the same algorithm and the correct key to convert the ciphertext back into its original, readable plaintext form.

The package provides functions for both encryption and decryption. On top of that the function provides `encryptObj` and `decryptObj` functions that work the same way but for objects (using JSON serialization).

#### Secret Key Creation

Before encrypting or decrypting data, you need to create a secret key.

Each key is tied to a specific platform (Web or Node.js) and cannot be used interchangeably.

```typescript
import { createSecretKey } from 'cipher-kit/node'; // or 'cipher-kit/web-api'

const secretKey = createSecretKey('my-passphrase');
```

The function accepts an optional `options` as well, which allows you to customize the key derivation process.

```typescript
interface CreateSecretKeyOptions {
  // Which encryption algorithm to use (default: "aes256gcm")
  algorithm?: 'aes256gcm' | 'aes192gcm' | 'aes128gcm';

  // Digest algorithm for HKDF (key derivation) (default: "sha256")
  digest?: 'sha256' | 'sha384' | 'sha512';

  // Optional salt for HKDF (key derivation), if you provide a random one it will return a different key each time (default: "cipher-kit-salt", must be >= 8 characters).
  salt?: string;

  // Optional context info for HKDF (default: "cipher-kit").
  info?: string;
}
```

#### Encrypting Data

```typescript
import { encrypt } from 'cipher-kit/node'; // or 'cipher-kit/web-api'

const encrypted = encrypt('Hello, World!', secretKey);
console.log(`Encrypted: ${encrypted}`);
```

The function accepts an optional `options` parameter to customize the output encoding.

```typescript
interface EncryptOptions {
  // Output ciphertext encoding(default: "base64url")
  encoding?: 'base64url' | 'base64' | 'hex';
}
```

#### Decrypting Data

```typescript
import { decrypt } from 'cipher-kit/node'; // or 'cipher-kit/web-api'

const decrypted = decrypt(encrypted, secretKey);
console.log(`Decrypted: ${decrypted}`);
```

The function accepts an optional `options` parameter to specify the input encoding.

Make sure to use the same encoding that was used during encryption.

```typescript
interface DecryptOptions {
  // Input ciphertext encoding (default: "base64url")
  encoding?: 'base64url' | 'base64' | 'hex';
}
```

### Hashing

Hashing is a one-way process that uses an algorithm to transform data of any size into a fixed-length string of characters, called a hash value or digest. It serves as a digital fingerprint for the data, enabling quick data retrieval in hash tables, password storage, and file integrity checks. Key features include its irreversibility (you can't get the original data back from the hash).

```typescript
import { hash } from 'cipher-kit/node'; // or 'cipher-kit/web-api'

const hashed = hash('Hello, World!');
console.log(`Hashed: ${hashed}`);
```

The function accepts an optional `options` parameter to customize the hashing process.

```typescript
interface HashOptions {
  // Digest algorithm to use (default: "sha256").
  digest?: 'sha256' | 'sha384' | 'sha512';

  // Output encoding (default: "base64url").
  encoding?: 'base64url' | 'base64' | 'hex';
}
```

### UUID Generation

UUID (Universally Unique Identifier) is a 128-bit identifier used to uniquely identify information in computer systems. It is designed to be globally unique, meaning that no two UUIDs should be the same, even if generated on different systems or at different times. UUIDs are commonly used in databases, distributed systems, and applications where unique identification is crucial.

```typescript
import { generateUUID } from 'cipher-kit/node'; // or 'cipher-kit/web-api'

const uuid = generateUUID();
console.log(`Generated UUID: ${uuid}`);
```

### Password Hashing and Verification

Password hashing is a one-way process that transforms a plaintext password into a fixed-length hash. Password hashing is crucial for securely storing passwords in databases, as it protects user credentials from being exposed in case of a data breach.

Password hashing is different from general-purpose hashing because it often involves additional techniques like salting and key stretching to enhance security against brute-force attacks, and it's usually slower to compute to make rainbow table attacks less feasible.

To verify a password, the same hashing process is applied to the input password, and the resulting hash is compared to the stored hash, in a time-safe manner to prevent timing attacks.

```typescript
import { hashPassword, verifyPassword } from 'cipher-kit/node'; // or 'cipher-kit/web-api'

const password = 'my-secure-password';
const hashedPassword = hashPassword(password);
console.log(`Hashed Password: ${hashedPassword}`);

const isMatch = verifyPassword(password, hashedPassword);
console.log(`Password match: ${isMatch}`);
```

The `hashPassword` and `verifyPassword` functions accept an optional `options` parameter to customize the hashing process.

```typescript
interface HashPasswordOptions {
  // Digest algorithm to use (default: "sha512").
  digest?: 'sha256' | 'sha384' | 'sha512';

  // Encoding format for the output hash (default: "base64url").
  encoding?: 'base64url' | 'base64' | 'hex';

  // Length of the salt in bytes (default: 16 bytes, min: 8 bytes).
  saltLength?: number;

  // Number of iterations for key derivation (default: 320000, min: 1000).
  iterations?: number;

  // Length of the derived key in bytes (default: 64 bytes, min: 16 bytes).
  keyLength?: number;
}

interface VerifyPasswordOptions {
  // Digest algorithm used during the original hashing (default: `'sha512'`).
  digest?: 'sha256' | 'sha384' | 'sha512';

  // Encoding format used during the original hashing (default: `'base64url'`).
  encoding?: 'base64url' | 'base64' | 'hex';

  // Number of iterations used during the original hashing (default: `320000`).
  iterations?: number;

  // Length of the key used during the original hashing (default: `64`).
  keyLength?: number;
}
```

<!-- TODO obj <-> string, bytes <-> string, regex -->

## Contributions 🤝

Want to contribute or suggest a feature?

- Open an issue or feature request
- Submit a PR to improve the packages or add new ones
- Star ⭐ the repo if you like what you see

## License 📜

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

Thank you!
