# Changelog

## 4.2.0

- `encrypt`, `decrypt`, `encryptObj` and `decryptObj` take an optional `additionalData` (a string or `Uint8Array`, at most 65,536 bytes). It binds a ciphertext to its context, such as the ID of the record it belongs to: decryption fails unless you pass the same value. It is authenticated as AES-GCM additional data and is not stored in the ciphertext. An empty value is the same as none. Without it, output and decryption are unchanged.

## 4.1.0

- Supports Node.js 20.19 and later, and is tested on Bun, Deno 2 and Cloudflare Workers.
- On deployed Cloudflare Workers, pass `iterations: 100_000` to `hashPassword` and `verifyPassword`. Workers reject PBKDF2 above 100,000 iterations, and the default is 320,000.

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

## 3.0.0

Breaking changes:

- **Node and Web share one ciphertext format.** Both write `iv.cipher.tag.`, so either side decrypts what the other wrote. 2.x Web wrote `iv.cipherWithTag.`, which 3.x rejects. Decrypt that data with 2.x and encrypt it again with 3.x. Node ciphertext keeps its 2.x shape.
- **The default HKDF salt is `"cipher-kit"`.** 2.x used `"cipher-kit-salt"`. To decrypt 2.x data written with the default salt, pass `salt: "cipher-kit-salt"` to `createSecretKey`.
- **`ENCRYPTED_REGEX` is one `RegExp`, and `matchEncryptedPattern(data)` takes no format.** 2.x had separate `node`, `web`, and `general` patterns.
- **Web keys are not extractable by default.** `createSecretKey` takes a new `extractable` option, default `false`. 2.x Web keys were extractable.
- **`hashPassword` and `verifyPassword` need at least 100,000 iterations.** 2.x allowed 1,000.
- **`isNodeSecretKey` and `isWebSecretKey` leave the `cipher-kit` root.** Import them from `cipher-kit/node` and `cipher-kit/web-api`, or use `nodeKit.isNodeSecretKey` and `webKit.isWebSecretKey`.
- **`decryptObj` and `parseToObj` reject `__proto__` and `constructor.prototype` keys.**
- **`Result` wraps objects that have a `success` or `error` key** in `result` instead of spreading them.
- **Error messages changed.** They now start with the platform and function name, such as `node createSecretKey: Secret must be at least 8 characters`.
- **Requires Node.js >= 18.** Earlier versions declared no `engines`.

Other changes:

- `tryVerifyPassword` returns a `Result<boolean>`.
- `decrypt` checks the IV and auth tag lengths before decrypting.
- The Web types use the global `CryptoKey` and no longer import `node:crypto`.

## 2.1.2

- **The `SecretKey` type is replaced by `NodeSecretKey` and `WebSecretKey`.** Code that imports `SecretKey` must switch to one of them.
- Exports `isNodeSecretKey` and `isWebSecretKey` from `cipher-kit`. They leave the `nodeKit` and `webKit` namespaces; 3.0.0 puts them back.

## 2.1.1

- **`ResultErr` is renamed `ErrorStruct`, and `Result` takes one type parameter.** `Result<T, E>` becomes `Result<T>`.
- `stringifyObj` and `parseToObj` error messages start with `JSON:` instead of `Utility:`.

## 2.1.0

Breaking changes:

- **`encoding` splits into `outputEncoding` and `inputEncoding`.** `encrypt`, `hash`, and `hashPassword` take `outputEncoding`. `decrypt` and `verifyPassword` take `inputEncoding`.
- **`matchPattern` is renamed `matchEncryptedPattern`.**
- **`hashPassword` returns `{ result, salt }`** instead of `{ hash, salt }`.
- **`createSecretKey` needs a secret of at least 8 characters.**
- **Options must be a plain object.** Anything else fails.

## 2.0.0

Breaking changes:

- **Functions throw on failure.** `encrypt`, `decrypt`, `hash`, and the rest return plain values. Each has a `try*` twin, such as `tryEncrypt`, that returns a `Result` like 1.x did.
- **Keys are `SecretKey` objects.** `createSecretKey(secret, options)` takes only a string and returns a `SecretKey<"node">` or `SecretKey<"web">`. 1.x returned `{ secretKey }` with a raw `KeyObject` or `CryptoKey` and also accepted one as input. `isNodeKey` and `isWebApiKey` become `isNodeSecretKey` and `isWebSecretKey`.
- **Key derivation changed, so 1.x ciphertext does not decrypt.** 1.x used the SHA-256 of the secret as the key. 2.x derives it with HKDF, with default salt `"cipher-kit-salt"` and info `"cipher-kit"`. Decrypt 1.x data with 1.x and encrypt it again with 2.x.
- **The root export changed.** `cipher-kit` exports the `nodeKit` and `webKit` namespaces and shared helpers. 1.x also exported the Node functions at the root and named the Web namespace `webApiKit`. Import functions from `cipher-kit/node` or `cipher-kit/web-api`.
- **Encoding helpers are renamed.** `encode` and `decode` become `convertStrToBytes`, `convertBytesToStr`, and `convertEncoding`.
- **Format helpers are renamed.** `ENCRYPTION_REGEX`, `isInEncryptionFormat`, `isInNodeEncryptionFormat`, and `isInWebApiEncryptionFormat` become `ENCRYPTED_REGEX` and `matchPattern(data, format)`. `NODE_ALGORITHM` and `WEB_API_ALGORITHM` are removed.
- **`stringifyObj` and `parseToObj` throw.** Use `tryStringifyObj` and `tryParseToObj` for a `Result`.

Other changes:

- `hashPassword` and `verifyPassword` hash passwords with PBKDF2. Defaults: SHA-512, 320,000 iterations, 16-byte salt, 64-byte key.
- `createSecretKey` takes `algorithm` (`aes256gcm`, `aes192gcm`, `aes128gcm`), `digest` (`sha256`, `sha384`, `sha512`), `salt`, and `info`.
- `encrypt`, `decrypt`, and `hash` take an `encoding` option (`base64`, `base64url`, `hex`).

## 1.0.0

- First stable release, with the same code as 0.0.10.
- `cipher-kit/node` and `cipher-kit/web-api` provide AES-256-GCM `encrypt`, `decrypt`, `encryptObj`, and `decryptObj`, plus SHA-256 `hash`, `createSecretKey`, `generateUuid`, `encode`, and `decode`. Every function returns a `Result`.
- Node writes `iv.cipher.tag.` and Web writes `iv.cipherWithTag.`, so the two formats differ.

## 0.0.1 to 0.0.10

- Pre-release builds. Exports were renamed between them; for example, `newSecretKey` became `createSecretKey` and `newUuid` became `generateUuid`. Use 1.0.0 or later.
