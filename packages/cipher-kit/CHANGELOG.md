# Changelog

## 4.1.0

- Supports Node.js 20 and later, and is tested on Bun, Deno 2 and Cloudflare Workers.

## 4.0.0

Breaking changes:

- **Node.js >= 22.12** is required.
- **Lone UTF-16 surrogates are rejected.** 3.x replaced them with U+FFFD. This applies to `encrypt`, `hash`, `hashPassword`, `verifyPassword`, the secret and salt of `createSecretKey`, and UTF-8 encoding. A 3.x password hash made from a password with a lone surrogate no longer verifies.
- **Decoding is strict.** Non-canonical base64 (such as `AB==`), partial base64url padding (such as `YQ=`), invalid UTF-8, and latin1 above U+00FF now fail. 3.x accepted them on some platforms.
- **Objects hold at most 100,000 objects and arrays combined.** `encryptObj`, `decryptObj`, `stringifyObj`, and `parseToObj` enforce it.
- **`encryptObj` and `stringifyObj` reject `__proto__` and `constructor.prototype` keys.** 3.x wrote them, then refused to read them back.
- **Empty and whitespace-only input is accepted** by `hash`, `encrypt` (whitespace-only), and `convertEncoding`. 3.x rejected it.
- **Web keeps a leading U+FEFF** when it decrypts or decodes UTF-8. 3.x dropped it.
- **Error messages changed.** They no longer echo the rejected value, so code that matches message text must change.

Compatibility: the ciphertext format, key derivation, defaults, and password hash format are unchanged. 4.x decrypts and verifies everything 3.x wrote. 3.x decrypts what 4.x writes, within 3.x's own Web limits: it drops a leading U+FEFF and fails on payloads above about 4 MB. A test pins this against output from the published 3.0.0.
