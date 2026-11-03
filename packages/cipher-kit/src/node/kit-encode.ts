import type { Buffer } from "node:buffer";
import { $fmtResultErr } from "@internal/helpers";
import type { Result } from "@internal/helpers";
import { $guard } from "~/helpers/guard.js";
import type { Encoding } from "~/helpers/types.js";
import { $convertBytesToStr, $convertEncoding, $convertStrToBytes } from "./node-encode.js";

/**
 * Converts a string to a `Buffer` (non-throwing).
 *
 * @returns `Result<{ result: Buffer }>` with the buffer or error.
 * @see {@link convertStrToBytes} For full parameter/behavior docs.
 */
export function tryConvertStrToBytes(data: string, inputEncoding: Encoding = "utf8"): Result<{ result: Buffer }> {
  return $guard("node convertStrToBytes", () => $convertStrToBytes(data, inputEncoding));
}

/**
 * Converts a string to a Node.js `Buffer` using the specified encoding.
 *
 * @remarks
 * Decoding is strict and identical on Node and Web: base64 must be canonical with exact padding,
 * base64url padding is optional but must be exact when present, latin1 accepts only code points up to 255,
 * and utf8 rejects lone UTF-16 surrogates.
 *
 * @param data - The input string to convert.
 * @param inputEncoding - Source encoding (default: `'utf8'`).
 * @returns A `Buffer` containing the bytes.
 * @throws {Error} If input is invalid or conversion fails.
 *
 * @example
 * ```ts
 * const bytes = convertStrToBytes("Hello", "utf8");
 * ```
 *
 * @see {@link tryConvertStrToBytes} Non-throwing variant returning `Result`.
 */
export function convertStrToBytes(data: string, inputEncoding: Encoding = "utf8"): Buffer {
  const { result, error } = tryConvertStrToBytes(data, inputEncoding);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Converts a `Buffer` to a string (non-throwing).
 *
 * @returns `Result<string>` with the encoded string or error.
 * @see {@link convertBytesToStr} For full parameter/behavior docs.
 */
export function tryConvertBytesToStr(data: Buffer, outputEncoding: Encoding = "utf8"): Result<string> {
  return $guard("node convertBytesToStr", () => $convertBytesToStr(data, outputEncoding));
}

/**
 * Converts a Node.js `Buffer` to a string using the specified encoding.
 *
 * @param data - The `Buffer` to convert.
 * @param outputEncoding - Target encoding (default: `'utf8'`).
 * @returns The encoded string.
 * @throws {Error} If input is invalid or conversion fails.
 *
 * @example
 * ```ts
 * const bytes = convertStrToBytes("Hello", "utf8");
 * const str = convertBytesToStr(bytes, "utf8"); // "Hello"
 * ```
 *
 * @see {@link tryConvertBytesToStr} Non-throwing variant returning `Result<string>`.
 */
export function convertBytesToStr(data: Buffer, outputEncoding: Encoding = "utf8"): string {
  const { result, error } = tryConvertBytesToStr(data, outputEncoding);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Converts text between encodings (non-throwing).
 *
 * @returns `Result<string>` with the re-encoded string or error.
 * @see {@link convertEncoding} For full parameter/behavior docs.
 */
export function tryConvertEncoding(data: string, from: Encoding, to: Encoding): Result<string> {
  return $guard("node convertEncoding", () => $convertEncoding(data, from, to));
}

/**
 * Converts text between encodings.
 *
 * @remarks
 * Uses the same strict rules as {@link convertStrToBytes}. Converting to `utf8` fails on invalid UTF-8 bytes
 * instead of inserting U+FFFD.
 *
 * @param data - The input string.
 * @param from - Current encoding of `data`.
 * @param to - Target encoding.
 * @returns The re-encoded string.
 * @throws {Error} If encodings are invalid or conversion fails.
 *
 * @example
 * ```ts
 * const encoded = convertEncoding("Hello", "utf8", "base64url");
 * ```
 *
 * @see {@link tryConvertEncoding} Non-throwing variant returning `Result<string>`.
 */
export function convertEncoding(data: string, from: Encoding, to: Encoding): string {
  const { result, error } = tryConvertEncoding(data, from, to);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}
