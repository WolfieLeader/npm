# Changelog

## 4.1.0

- Supports Node.js 20 and later, and is tested on Bun, Deno 2 and Cloudflare Workers.

## 4.0.0

Breaking changes:

- **Default output limit.** `decompress`, `tryDecompress`, `decompressObj`, and `tryDecompressObj` now cap output at 10 MiB. Pass `maxOutputSize: Infinity` to restore unlimited output.
- **`maxOutputSize: 0` is rejected.** It used to mean "no limit". Use `Infinity` instead.
- **Corrupt streams fail.** With `maxOutputSize` set, 3.x returned `""` or a partial string for garbage, truncated, bad-checksum, or trailing-data input. These now return `decompress: Failed to decompress data`.
- **`windowBits` on decompress is removed.** The window size comes from the stream header, so data compressed with any `windowBits` (including `8`) decompresses. A stray `windowBits` passed at runtime is ignored.
- **Lone UTF-16 surrogates are rejected.** 3.x replaced them with U+FFFD.
- **A leading U+FEFF is kept.** 3.x dropped it on decompress.
- **Decoding is strict.** Non-canonical base64 and whitespace now fail. Strings that compress-kit wrote are always canonical.
- **`compressObj` rejects `__proto__` and `constructor.prototype` keys.** 3.x wrote them, then `decompressObj` refused to read them back.
- **Error messages no longer echo the rejected option value.** Code that matches message text must change.
- **Node.js >= 22.12** is required.
- **pako 3.** Compressed bytes can differ from 3.x for the same input.

Compatibility: 4.x decompresses every string produced by 2.x and 3.x, and 3.x decompresses strings produced by 4.x. The tagged format (`.0.` / `.1.` + zlib stream) is unchanged.
