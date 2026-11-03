# Changelog

## 4.1.0

- Supports Node.js 20.19 and later, and is tested on Bun, Deno 2 and Cloudflare Workers.

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

## 3.0.0

Breaking changes:

- **Invalid UTF-8 fails on decompress.** 2.x replaced it with U+FFFD.
- **`decompressObj` rejects `__proto__` and `constructor.prototype` keys.**
- **`Result` wraps objects that have a `success` or `error` key** in `result` instead of spreading them.
- **Error messages changed.** They now start with the function name, such as `compress: Invalid level: 10`. 2.x wrote `Compression: Invalid level`.
- **Requires Node.js >= 18.** Earlier versions declared no `engines`.

Other changes:

- `maxOutputSize` on `decompress`, `tryDecompress`, `decompressObj`, and `tryDecompressObj` caps the output size. Without it, output is unlimited, so set it for untrusted input. 4.0.0 adds a default cap.
- Exports the `CompressOptions`, `DecompressOptions`, `CompressEncoding`, `Result`, `ErrorStruct`, `OneToNine`, and `EightToFifteen` types.

## 2.0.0

Breaking changes:

- **Functions throw on failure.** `compress`, `decompress`, `compressObj`, and `decompressObj` return plain values. `tryCompress`, `tryDecompress`, `tryCompressObj`, and `tryDecompressObj` return a `Result` like 1.x did.
- **Format helpers are removed.** `COMPRESSION_REGEX`, `isInCompressionFormat`, `isInCompressedFormat`, and `isInUncompressedFormat` are gone.
- **`cipher-kit` is no longer a dependency.** `pako` is the only runtime dependency.
- **`memLevel` defaults to 8.** 1.x used 7, so compressed output can differ for the same input.

Other changes:

- `compress` takes `outputEncoding` (`base64`, `base64url`, `hex`), `level`, `windowBits`, `memLevel`, and `strategy`. `decompress` takes `inputEncoding` and `windowBits`.
- The `.0.` and `.1.` suffixes and the `base64url` default are unchanged.

## 1.1.0

- No code changes. The README gains a usage section.

## 1.0.0

- First stable release. `compress`, `decompress`, `compressObj`, and `decompressObj` return a `Result`. Output is base64url text ending in `.0.` (stored) or `.1.` (deflated).
- Lists `cipher-kit` as a dependency. 0.0.5 imported `cipher-kit/web-api` without listing it.

## 0.0.1 to 0.0.5

- Pre-release builds. 0.0.3 renamed `COMPRESSED_REGEX` to `COMPRESSION_REGEX` and added the `isIn*Format` helpers. Use 1.0.0 or later.
