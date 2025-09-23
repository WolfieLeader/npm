<div align="center">
<img src="https://github.com/WolfieLeader/npm/blob/main/assets/cipher-kit-banner.svg" align="center" alt="banner" />

<h1 align="center" style="font-weight:900;">cipher-kit</h1>

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

## About 📖

`cipher-kit` is a modern encryption toolkit designed to work seamlessly across **Web**, **Node.js**, **Deno**, and **Bun** environments.  
It provides a simple, secure, and dependency-free API for encrypting and decrypting data with **AES-GCM**, ensuring strong security, predictable behavior, and type safety.

## Features 🌟

- 🛡️ **AES-GCM Encryption** – Secure and authenticated encryption with built-in integrity checks.
- 🌐 **Cross-Platform** – Works in Web, Node.js, Deno, and Bun without code changes.
- 🚫 **Zero Dependencies** – Fully self-contained, no external libraries required.
- 🔒 **SHA-256 Key Derivation** – Derives strong encryption keys from passwords.
- 🧪 **Strict Validation & `Result<T>` Typing** – Unified return type with robust input validation.

## Installation 🔥

```bash
npm install cipher-kit@latest
```

> 💡 Works with `npm`, `pnpm`, `yarn`, `bun`, and `deno`. You can use it in dev dependencies since it's typically used only for local HTTPS.

## Usage 🪛

Pick the runtime you’re targeting, or import from the root:

```typescript
// For Node.js
import { encrypt, decrypt } from 'cipher-kit/node';

// For Web API, Deno, Bun, Cloudflare Workers
import { encrypt, decrypt } from 'cipher-kit/web-api';

// Or import everything from the root
// Functions that, for example encrypt and decrypt will use Node.js implementation.
// You can also access web and node object kits directly.
import { encrypt, decrypt, nodeKit, webKit } from 'cipher-kit';
```

Functions that throw error will show that in their JSDoc comments.

If you would like to avoid using `try/catch`, you can use the functions that prefixed with `try`, e.g., `tryEncrypt`, `tryDecrypt`, `tryEncryptObj`, `tryDecryptObj`. You need to check if the `error` is `undefined` or the `success` is `true` to ensure the operation was successful.

### Node.js Example:

```typescript
import {
  generateUuid,
  hash,
  createSecretKey,
  encrypt,
  decrypt,
  encryptObj,
  decryptObj,
  tryEncrypt,
  tryDecrypt,
} from 'cipher-kit/node';

const STRING = 'The brown fox 🦊 jumps over the lazy dog 🐶.';

function nodeExample() {
  console.log(`New UUID: ${generateUuid()}`);

  console.log(`SHA-256 Hash (ABCDEFG): ${hash('ABCDEFG')}`);

  const secretKey = createSecretKey('my secure passphrase');

  const encrypted = encrypt(STRING, secretKey);
  console.log(`Encrypted Data: ${encrypted}`);
  console.log(`Decrypted Data: ${decrypt(encrypted, secretKey)}`);

  const encryptedObj = encryptObj({ message: 'Hello, World! 🌍', count: 42 }, secretKey);
  console.log(`Encrypted Object: ${encryptedObj}`);
  console.log(`Decrypted Object: ${JSON.stringify(decryptObj(encryptedObj, secretKey))}`);

  const { result: tryEncrypted, error: tryEncryptError } = tryEncrypt(STRING, secretKey);
  if (tryEncryptError) {
    console.error(`Encryption Try failed: ${tryEncryptError.message} - ${tryEncryptError.description}`);
    return;
  }
  console.log(`Encrypted Try Data: ${tryEncrypted}`);

  const decryptedTry = tryDecrypt(tryEncrypted, secretKey);
  if (decryptedTry.success === false) {
    console.error(`Decryption Try failed: ${decryptedTry.error.message} - ${decryptedTry.error.description}`);
    return;
  }
  console.log(`Try Decrypted Data: ${decryptedTry.result}`);
}

nodeExample();
```

### Web API Example:

```typescript
import {
  generateUuid,
  hash,
  createSecretKey,
  encrypt,
  decrypt,
  encryptObj,
  decryptObj,
  tryEncrypt,
  tryDecrypt,
} from 'cipher-kit/web-api';

const STRING = 'The brown fox 🦊 jumps over the lazy dog 🐶.';

async function webApiExample() {
  console.log(`New UUID: ${generateUuid()}`);

  console.log(`SHA-256 Hash (ABCDEFG): ${await hash('ABCDEFG')}`);

  const secretKey = await createSecretKey('my secure passphrase');

  const encrypted = await encrypt(STRING, secretKey);
  console.log(`Encrypted Data: ${encrypted}`);
  console.log(`Decrypted Data: ${await decrypt(encrypted, secretKey)}`);

  const encryptedObj = await encryptObj({ message: 'Hello, World! 🌍', count: 42 }, secretKey);
  console.log(`Encrypted Object: ${encryptedObj}`);
  console.log(`Decrypted Object: ${JSON.stringify(await decryptObj(encryptedObj, secretKey))}`);

  const { result: tryEncrypted, error: tryEncryptError } = await tryEncrypt(STRING, secretKey);
  if (tryEncryptError) {
    console.error(`Encryption Try failed: ${tryEncryptError.message} - ${tryEncryptError.description}`);
    return;
  }
  console.log(`Encrypted Try Data: ${tryEncrypted}`);

  const decryptedTry = await tryDecrypt(tryEncrypted, secretKey);
  if (decryptedTry.success === false) {
    console.error(`Decryption Try failed: ${decryptedTry.error.message} - ${decryptedTry.error.description}`);
    return;
  }
  console.log(`Try Decrypted Data: ${decryptedTry.result}`);
}

webApiExample();
```

## Contributions 🤝

Want to contribute or suggest a feature?

- Open an issue or feature request
- Submit a PR to improve the packages or add new ones
- Star ⭐ the repo if you like what you see

## License 📜

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

Thank you!
