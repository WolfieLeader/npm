import { $compress, $compressObj, $decompress, $decompressObj } from "./compress";
import { $fmtResultErr, type Result } from "./helpers/error";
import type { CompressOptions, DecompressOptions } from "./helpers/types";

/**
 * Safely compresses a UTF-8 string (non-throwing).
 *
 * The output is either:
 * - `<base64|base64url|hex>.0.` - When compression wouldn't help (store-only), or
 * - `<base64|base64url|hex>.1.` - When compression wins (deflated).
 *
 * ### 🍼 Explain Like I'm Five
 * You want to send a long message (data) to your friend, the message is really long,
 * so you want to pack it into a smaller box (compressed data) to save space.
 *
 * @param data - A UTF-8 string to compress.
 * @param options.outputEncoding - Output encoding (`'base64' | 'base64url' | 'hex'`; default: `'base64url'`).
 * @param options.level - Compression level (1..9; default: 6).
 * @param options.windowBits - Window size exponent (8..15; default: 15; actual window = 2^n bytes).
 * @param options.memLevel - Match-finder memory (1..9; default: 8).
 * @param options.strategy - Compression strategy (`'default' | 'filtered' | 'huffmanOnly' | 'rle' | 'fixed'`; default: `'default'`).
 * @returns A `Result` with a tagged compressed string or an error.
 *
 * @example
 * ```ts
 * const { result, error, success } = tryCompress("Hello world");
 *
 * if (success) console.log(result); // "..." (Compressed string)
 * else console.error(error); // { message: "...", description: "..." }
 * ```
 */
export function tryCompress(data: string, options: CompressOptions = {}): Result<string> {
  return $compress(data, options);
}

/**
 * Compresses a UTF-8 string (throwing).
 *
 * The output is either:
 * - `<base64|base64url|hex>.0.` - When compression wouldn't help (store-only), or
 * - `<base64|base64url|hex>.1.` - When compression wins (deflated).
 *
 * ### 🍼 Explain Like I'm Five
 * You want to send a long message (data) to your friend, the message is really long,
 * so you want to pack it into a smaller box (compressed data) to save space.
 *
 * @param data - A UTF-8 string to compress.
 * @param options.outputEncoding - Output encoding (`'base64' | 'base64url' | 'hex'`; default: `'base64url'`).
 * @param options.level - Compression level (1..9; default: 6).
 * @param options.windowBits - Window size exponent (8..15; default: 15; actual window = 2^n bytes).
 * @param options.memLevel - Match-finder memory (1..9; default: 8).
 * @param options.strategy - Compression strategy (`'default' | 'filtered' | 'huffmanOnly' | 'rle' | 'fixed'`; default: `'default'`).
 * @returns A tagged compressed string.
 * @throws {Error} If compression fails.
 *
 * @example
 * ```ts
 * const compressed = compress("Hello world"); // "..." (Compressed string)
 * ```
 */
export function compress(data: string, options: CompressOptions = {}): string {
  const { result, error } = $compress(data, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Safely decompresses a tagged string produced by `tryCompress`/`compress` (non-throwing).
 *
 * Accepts only inputs ending with `.0.` or `.1.`:
 * - `.0.` - decodes as-is (no inflate)
 * - `.1.` - inflates (DEFLATE) and returns UTF-8 text
 *
 * ### 🍼 Explain Like I'm Five
 * You receive a packed box (compressed data) from your friend,
 * you want to open the box and take out the message (data) to read it again.
 * So you carefully unpack the box (decompress) to get your message back.
 *
 * @param compressed - The tagged string to decompress.
 * @param options.inputEncoding - Encoding of the payload part (`'base64' | 'base64url' | 'hex'`; default: `'base64url'`).
 * @param options.windowBits - Window size exponent for inflate (8..15; default: 15).
 * @returns A `Result` with the original UTF-8 string or an error.
 *
 * @example
 * ```ts
 * const compressed = compress("Hello world");
 * const { result, error, success } = tryDecompress(compressed);
 *
 * if (success) console.log(result); // "Hello world"
 * else console.error(error); // { message: "...", description: "..." }
 * ```
 */
export function tryDecompress(compressed: string, options: DecompressOptions = {}): Result<string> {
  return $decompress(compressed, options);
}

/**
 * Decompresses a tagged string produced by `tryCompress`/`compress` (throwing).
 *
 * Accepts only inputs ending with `.0.` or `.1.`:
 * - `.0.` - decodes as-is (no inflate)
 * - `.1.` - inflates (DEFLATE) and returns UTF-8 text
 *
 * ### 🍼 Explain Like I'm Five
 * You receive a packed box (compressed data) from your friend,
 * you want to open the box and take out the message (data) to read it again.
 * So you carefully unpack the box (decompress) to get your message back.
 *
 * @param compressed - The tagged string to decompress.
 * @param options.inputEncoding - Encoding of the payload part (`'base64' | 'base64url' | 'hex'`; default: `'base64url'`).
 * @param options.windowBits - Window size exponent for inflate (8..15; default: 15).
 * @return The original UTF-8 string.
 * @throws {Error} If decompression fails or the input format is invalid.
 *
 * @example
 * ```ts
 * const compressed = compress("Hello world");
 * const original = decompress(compressed); // "Hello world"
 * ```
 */
export function decompress(compressed: string, options: DecompressOptions = {}): string {
  const { result, error } = $decompress(compressed, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Safely compresses a plain object (non-throwing).
 *
 * Only plain objects (POJOs) are accepted. Class instances, Maps, Sets, etc. are rejected.
 *
 * The output is either:
 * - `<base64|base64url|hex>.0.` - When compression wouldn't help (store-only), or
 * - `<base64|base64url|hex>.1.` - When compression wins (deflated).
 *
 * ### 🍼 Explain Like I'm Five
 * You want to send a long message (obj) to your friend, the message is really long,
 * so you want to pack it into a smaller box (compressed obj) to save space.
 *
 * @template T - The type of the plain object to compress.
 * @param obj - A plain object to compress.
 * @param options.outputEncoding - Output encoding (`'base64' | 'base64url' | 'hex'`; default: `'base64url'`).
 * @param options.level - Compression level (1..9; default: 6).
 * @param options.windowBits - Window size exponent (8..15; default: 15; actual window = 2^n bytes).
 * @param options.memLevel - Match-finder memory (1..9; default: 8).
 * @param options.strategy - Compression strategy (`'default' | 'filtered' | 'huffmanOnly' | 'rle' | 'fixed'`; default: `'default'`).
 * @returns A `Result` with a tagged compressed string or an error.
 *
 * @example
 * ```ts
 * const { result, error, success } = tryCompressObj({ hello: "world" });
 *
 * if (success) console.log(result); // "..." (Compressed string)
 * else console.error(error); // { message: "...", description: "..." }
 * ```
 */
export function tryCompressObj<T extends object = Record<string, unknown>>(
  obj: T,
  options: CompressOptions = {},
): Result<string> {
  return $compressObj<T>(obj, options);
}

/**
 * Compresses a plain object (throwing).
 *
 * Only plain objects (POJOs) are accepted. Class instances, Maps, Sets, etc. are rejected.
 *
 * The output is either:
 * - `<base64|base64url|hex>.0.` - When compression wouldn't help (store-only), or
 * - `<base64|base64url|hex>.1.` - When compression wins (deflated).
 *
 * ### 🍼 Explain Like I'm Five
 * You want to send a long message (obj) to your friend, the message is really long,
 * so you want to pack it into a smaller box (compressed obj) to save space.
 *
 * @param obj - A plain object to compress.
 * @param options.outputEncoding - Output encoding (`'base64' | 'base64url' | 'hex'`; default: `'base64url'`).
 * @param options.level - Compression level (1..9; default: 6).
 * @param options.windowBits - Window size exponent (8..15; default: 15; actual window = 2^n bytes).
 * @param options.memLevel - Match-finder memory (1..9; default: 8).
 * @param options.strategy - Compression strategy (`'default' | 'filtered' | 'huffmanOnly' | 'rle' | 'fixed'`; default: `'default'`).
 * @returns A tagged compressed string.
 * @throws {Error} If compression fails or the input is not a plain object.
 *
 * @example
 * ```ts
 * const compressed = compressObj({ hello: "world" }); // "..." (Compressed string)
 * ```
 */
export function compressObj<T extends object = Record<string, unknown>>(obj: T, options: CompressOptions = {}): string {
  const { result, error } = $compressObj<T>(obj, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Safely decompresses a tagged string to a plain object (non-throwing).
 *
 * ### 🍼 Explain Like I'm Five
 * You receive a packed box (compressed obj) from your friend,
 * you want to open the box and take out the message (obj) to read it again.
 * So you carefully unpack the box (decompress) to get your message back.
 *
 * @template T - The type of the plain object to decompress into.
 * @param compressed - The tagged string to decompress.
 * @param options.inputEncoding - Encoding of the payload part (`'base64' | 'base64url' | 'hex'`; default: `'base64url'`).
 * @param options.windowBits - Window size exponent for inflate (8..15; default: 15).
 * @returns A `Result` with the original plain object or an error.
 *
 * @example
 * ```ts
 * const compressed = compressObj({ hello: "world" });
 * const { result, error, success } = tryDecompressObj<{ hello: string }>(compressed);
 *
 * if (success) console.log(result); // { hello: "world" } (Decompressed object)
 * else console.error(error); // { message: "...", description: "..." }
 * ```
 */
export function tryDecompressObj<T extends object = Record<string, unknown>>(
  compressed: string,
  options: DecompressOptions = {},
): Result<{ result: T }> {
  return $decompressObj<T>(compressed, options);
}

/**
 * Decompresses a tagged string to a plain object (throwing).
 *
 * ### 🍼 Explain Like I'm Five
 * You receive a packed box (compressed obj) from your friend,
 * you want to open the box and take out the message (obj) to read it again.
 * So you carefully unpack the box (decompress) to get your message back.
 *
 * @param compressed - The tagged string to decompress.
 * @param options.inputEncoding - Encoding of the payload part (`'base64' | 'base64url' | 'hex'`; default: `'base64url'`).
 * @param options.windowBits - Window size exponent for inflate (8..15; default: 15).
 * @returns The original plain object.
 * @throws {Error} If decompression fails or the input format is invalid.
 *
 * @example
 * ```ts
 * const compressed = compressObj({ hello: "world" });
 * const obj = decompressObj<{ hello: string }>(compressed); // { hello: "world" }
 * ```
 */
export function decompressObj<T extends object = Record<string, unknown>>(
  compressed: string,
  options: DecompressOptions = {},
): { result: T } {
  const { result, error } = $decompressObj<T>(compressed, options);
  if (error) throw new Error($fmtResultErr(error));
  return { result };
}
