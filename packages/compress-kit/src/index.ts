import { $fmtResultErr, type Result } from "@internal/helpers";
import { $compress, $compressObj, $decompress, $decompressObj } from "./compress.js";
import type { CompressOptions, DecompressOptions } from "./types.js";

export type { ErrorStruct, Result } from "@internal/helpers";
export type {
  CompressEncoding,
  CompressOptions,
  DecompressOptions,
  EightToFifteen,
  OneToNine,
} from "./types.js";

/**
 * Compresses a UTF-8 string (non-throwing).
 *
 * @returns `Result<string>` with the tagged compressed output or error.
 * @see {@link compress} For full parameter/behavior docs.
 */
export function tryCompress(data: string, options: CompressOptions = {}): Result<string> {
  return $compress(data, options);
}

/**
 * Compresses a UTF-8 string.
 *
 * @remarks
 * Output is a tagged payload: `<encoded>.0.` (stored, compression not beneficial)
 * or `<encoded>.1.` (deflated).
 *
 * @param data - UTF-8 string to compress. Must be a non-empty string (whitespace-only strings are rejected).
 * @param options - Compression options.
 * @returns Tagged compressed string.
 * @throws {Error} If compression fails.
 *
 * @example
 * ```ts
 * const compressed = compress("Hello world");
 * ```
 *
 * @see {@link tryCompress} Non-throwing variant returning `Result<string>`.
 */
export function compress(data: string, options: CompressOptions = {}): string {
  const { result, error } = $compress(data, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Decompresses a tagged string (non-throwing).
 *
 * @returns `Result<string>` with the original UTF-8 string or error.
 * @see {@link decompress} For full parameter/behavior docs.
 */
export function tryDecompress(compressed: string, options: DecompressOptions = {}): Result<string> {
  return $decompress(compressed, options);
}

/**
 * Decompresses a tagged string produced by {@link compress} or {@link tryCompress}.
 *
 * @remarks
 * Accepts inputs ending with `.0.` (stored — decoded as-is) or `.1.` (inflated via DEFLATE).
 * Set `maxOutputSize` in options to enforce output-size limits.
 * For `.1.` payloads this aborts streaming decompression before crossing the limit.
 * For `.0.` payloads it rejects based on encoded-size precheck and decoded-byte verification.
 *
 * **Security note:** Without `maxOutputSize`, there is no decompression bomb protection.
 * A crafted payload can expand to gigabytes and exhaust memory. Always set `maxOutputSize`
 * when decompressing untrusted input.
 *
 * @param compressed - The tagged string to decompress.
 * @param options - Decompression options.
 * @returns The original UTF-8 string.
 * @throws {Error} If decompression fails or the input format is invalid.
 *
 * @example
 * ```ts
 * const compressed = compress("Hello world");
 * const original = decompress(compressed); // "Hello world"
 * ```
 *
 * @see {@link tryDecompress} Non-throwing variant returning `Result<string>`.
 */
export function decompress(compressed: string, options: DecompressOptions = {}): string {
  const { result, error } = $decompress(compressed, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Compresses a plain object (non-throwing).
 *
 * @returns `Result<string>` with the tagged compressed output or error.
 * @see {@link compressObj} For full parameter/behavior docs.
 */
export function tryCompressObj<T extends object = Record<string, unknown>>(
  obj: T,
  options: CompressOptions = {},
): Result<string> {
  return $compressObj<T>(obj, options);
}

/**
 * Compresses a plain object.
 *
 * @remarks
 * Only plain objects (POJOs) are accepted; class instances, Maps, Sets, etc. are rejected.
 * Output format follows the same `<encoded>.0.` / `<encoded>.1.` convention as {@link compress}.
 *
 * @param obj - Plain object to compress.
 * @param options - Compression options.
 * @returns Tagged compressed string.
 * @throws {Error} If compression fails or the input is not a plain object.
 *
 * @example
 * ```ts
 * const compressed = compressObj({ hello: "world" });
 * ```
 *
 * @see {@link tryCompressObj} Non-throwing variant returning `Result<string>`.
 */
export function compressObj<T extends object = Record<string, unknown>>(obj: T, options: CompressOptions = {}): string {
  const { result, error } = $compressObj<T>(obj, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Decompresses a tagged string to a plain object (non-throwing).
 *
 * @returns `Result<{ result: T }>` with the object or error.
 * @see {@link decompressObj} For full parameter/behavior docs.
 */
export function tryDecompressObj<T extends object = Record<string, unknown>>(
  compressed: string,
  options: DecompressOptions = {},
): Result<{ result: T }> {
  return $decompressObj<T>(compressed, options);
}

/**
 * Decompresses a tagged string to a plain object.
 *
 * @param compressed - The tagged string to decompress.
 * @param options - Decompression options.
 * @returns The original plain object.
 * @throws {Error} If decompression fails or the input format is invalid.
 *
 * @example
 * ```ts
 * const compressed = compressObj({ hello: "world" });
 * const obj = decompressObj<{ hello: string }>(compressed); // { hello: "world" }
 * ```
 *
 * @see {@link tryDecompressObj} Non-throwing variant returning `Result`.
 */
export function decompressObj<T extends object = Record<string, unknown>>(
  compressed: string,
  options: DecompressOptions = {},
): T {
  const { result, error } = $decompressObj<T>(compressed, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}
