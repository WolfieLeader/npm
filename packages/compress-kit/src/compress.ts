import {
  $convertBytesToStr,
  $convertStrToBytes,
  $err,
  $fmtError,
  $isIntIn,
  $isPlainObj,
  $isStr,
  $newStrictUtf8Decoder,
  $ok,
  $parseToObj,
  $stringifyObj,
  CIPHER_ENCODING,
} from "@internal/helpers";
import type { ErrorStruct, ErrResult, Result } from "@internal/helpers";
import {
  deflate,
  Inflate,
  Z_BUF_ERROR,
  Z_DEFAULT_STRATEGY,
  Z_FILTERED,
  Z_FIXED,
  Z_HUFFMAN_ONLY,
  Z_OK,
  Z_RLE,
} from "pako";
import type { Z_Strategy, ZStream } from "pako";
import type { CompressEncoding, CompressOptions, DecompressOptions } from "./types.js";

const STRATEGIES = Object.freeze({
  default: Z_DEFAULT_STRATEGY,
  filtered: Z_FILTERED,
  huffmanOnly: Z_HUFFMAN_ONLY,
  rle: Z_RLE,
  fixed: Z_FIXED,
} as const);

/** Default `maxOutputSize` for decompression: 10 MiB. */
const DEFAULT_MAX_OUTPUT_SIZE = 10 * 1024 * 1024;

/** Largest zlib window. Inflating with it accepts any window size declared in the stream header. */
const MAX_WINDOW_BITS = 15;

interface ResolvedCompressOptions {
  outputEncoding: CompressEncoding;
  level: number;
  windowBits: number;
  memLevel: number;
  strategy: Z_Strategy;
}

interface IntCheck {
  name: string;
  value: unknown;
  min: number;
  max: number;
}

function $checkInt(prefix: string, { name, value, min, max }: IntCheck): ErrorStruct | undefined {
  if ($isIntIn(value, min, max)) return undefined;
  return {
    message: `${prefix}: Invalid ${name}`,
    description: `${name} must be an integer between ${min} and ${max}`,
  };
}

function $checkEncoding(prefix: string, label: string, encoding: unknown): ErrorStruct | undefined {
  if (CIPHER_ENCODING.some((supported) => supported === encoding)) return undefined;
  return {
    message: `${prefix}: Unsupported ${label} encoding`,
    description: "Use base64, base64url, or hex",
  };
}

const OPTIONS_NOT_OBJECT = (prefix: string): ErrorStruct => ({
  message: `${prefix}: Options must be a plain object`,
  description: "Pass a plain object ({...}) as the options argument",
});

function $isStrategy(x: unknown): x is keyof typeof STRATEGIES {
  return $isStr(x) && Object.hasOwn(STRATEGIES, x);
}

function $resolveCompressOptions(options: CompressOptions): ResolvedCompressOptions | ErrorStruct {
  if (!$isPlainObj<CompressOptions>(options)) return OPTIONS_NOT_OBJECT("compress");

  const outputEncoding = options.outputEncoding ?? "base64url";
  const level = options.level ?? 6;
  const windowBits = options.windowBits ?? 15;
  const memLevel = options.memLevel ?? 8;
  const strategy = options.strategy ?? "default";
  const firstError = [
    $checkEncoding("compress", "output", outputEncoding),
    $checkInt("compress", { name: "level", value: level, min: 1, max: 9 }),
    $checkInt("compress", { name: "windowBits", value: windowBits, min: 8, max: 15 }),
    $checkInt("compress", { name: "memLevel", value: memLevel, min: 1, max: 9 }),
  ].find((error) => error !== undefined);
  if (firstError) return firstError;

  if (!$isStrategy(strategy)) {
    return {
      message: "compress: Invalid strategy",
      description: `Strategy must be one of: ${Object.keys(STRATEGIES).join(", ")}`,
    };
  }

  // zlib cannot write an 8-bit window in a zlib wrapper and silently uses 9. Do it explicitly.
  const effectiveWindowBits = windowBits === 8 ? 9 : windowBits;
  return { outputEncoding, level, windowBits: effectiveWindowBits, memLevel, strategy: STRATEGIES[strategy] };
}

export function $compress(data: string, options: CompressOptions): Result<string> {
  if (!$isStr(data)) {
    return $err({
      message: "compress: Data must be a non-empty string",
      description: "Provide a non-empty, non-whitespace string to compress",
    });
  }

  const resolved = $resolveCompressOptions(options);
  if ("message" in resolved) return $err(resolved);
  const { outputEncoding, ...deflateOptions } = resolved;

  const bytes = $convertStrToBytes(data, "utf8");
  if (bytes.error) return $err(bytes.error);

  try {
    const compressedBytes = deflate(bytes.result, { ...deflateOptions, raw: false });
    const stored = bytes.result.byteLength <= compressedBytes.byteLength;
    const encoded = $convertBytesToStr(stored ? bytes.result : compressedBytes, outputEncoding);
    if (encoded.error) return $err(encoded.error);
    return $ok(`${encoded.result}${stored ? ".0." : ".1."}`);
  } catch (error) {
    return $err({ message: "compress: Failed to compress data", description: $fmtError(error) });
  }
}

function $hexDecodedLength(data: string): number | null {
  // The hex decoder accepts a 0x prefix.
  const digits = data.startsWith("0x") || data.startsWith("0X") ? data.length - 2 : data.length;
  return digits % 2 === 0 ? digits / 2 : null;
}

function $estimateDecodedByteLength(data: string, encoding: CompressEncoding): number | null {
  if (encoding === "hex") return $hexDecodedLength(data);

  if (encoding === "base64") {
    if (data.length % 4 !== 0) return null;
    let padding = 0;
    if (data.endsWith("==")) padding = 2;
    else if (data.endsWith("=")) padding = 1;
    return (data.length / 4) * 3 - padding;
  }

  let length = data.length;
  while (length > 0 && data[length - 1] === "=") length--;
  if (length % 4 === 1) return null;
  const pad = (4 - (length % 4)) % 4;
  return ((length + pad) / 4) * 3 - pad;
}

interface ResolvedDecompressOptions {
  inputEncoding: CompressEncoding;
  maxSize: number;
}

function $resolveDecompressOptions(options: DecompressOptions): ResolvedDecompressOptions | ErrorStruct {
  if (!$isPlainObj<DecompressOptions>(options)) return OPTIONS_NOT_OBJECT("decompress");

  const inputEncoding = options.inputEncoding ?? "base64url";
  const maxOutputSize = options.maxOutputSize ?? DEFAULT_MAX_OUTPUT_SIZE;
  const encodingError = $checkEncoding("decompress", "input", inputEncoding);
  if (encodingError) return encodingError;

  if (maxOutputSize !== Number.POSITIVE_INFINITY && !$isIntIn(maxOutputSize, 1, Number.MAX_SAFE_INTEGER)) {
    return {
      message: "decompress: Invalid maxOutputSize",
      description: "maxOutputSize must be a positive integer, or Infinity to disable the limit",
    };
  }
  return { inputEncoding, maxSize: maxOutputSize };
}

const sizeLimitErr = (maxSize: number): ErrResult =>
  $err({
    message: "decompress: Output exceeds size limit",
    description: `Decompressed output exceeds maxOutputSize (${maxSize} bytes)`,
  });

function $readTag(compressed: unknown): ".0." | ".1." | undefined {
  if (!$isStr(compressed, 4)) return undefined;
  const tag = compressed.slice(-3);
  return tag === ".0." || tag === ".1." ? tag : undefined;
}

export function $decompress(compressed: string, options: DecompressOptions): Result<string> {
  const tag = $readTag(compressed);
  if (tag === undefined) {
    return $err({
      message: "decompress: Invalid compressed data format",
      description: "Data must end with '.0.' or '.1.' suffix",
    });
  }
  const isStored = tag === ".0.";

  const resolved = $resolveDecompressOptions(options);
  if ("message" in resolved) return $err(resolved);
  const { inputEncoding, maxSize } = resolved;

  const payload = compressed.slice(0, -3);
  if (isStored && ($estimateDecodedByteLength(payload, inputEncoding) ?? 0) > maxSize) return sizeLimitErr(maxSize);

  const bytes = $convertStrToBytes(payload, inputEncoding);
  if (bytes.error) return $err(bytes.error);

  if (!isStored) return $inflateToStr(bytes.result, maxSize);
  if (bytes.result.byteLength > maxSize) return sizeLimitErr(maxSize);
  return $convertBytesToStr(bytes.result, "utf8");
}

/** Thrown from `onData` to abort inflation. pako does not catch it. */
class InflateAbort extends Error {
  readonly reason: "size" | "decode";

  constructor(reason: "size" | "decode", options?: ErrorOptions) {
    super(`Inflate aborted: ${reason}`, options);
    this.reason = reason;
  }
}

const decompressErr = (description: string): ErrResult =>
  $err({ message: "decompress: Failed to decompress data", description });

const decodeErr = (error: unknown): ErrResult =>
  $err({ message: "decompress: Failed to decode output", description: $fmtError(error) });

/**
 * Checks the inflater state after `push(input, true)`: stream errors, truncation, and trailing bytes.
 *
 * @returns The error description, or `undefined` if the stream ended cleanly.
 */
function $checkInflateEnd(inflater: Inflate, strm: ZStream | undefined): string | undefined {
  if (inflater.err === Z_BUF_ERROR || (inflater.err === Z_OK && !inflater.ended)) {
    return "Compressed stream is truncated (unexpected end of data)";
  }
  if (inflater.err !== Z_OK) return inflater.msg || `zlib error code ${inflater.err}`;
  if (strm && strm.avail_in > 0) {
    return `Found ${strm.avail_in} bytes of trailing data after the end of the compressed stream`;
  }
  return undefined;
}

function $inflateToStr(input: Uint8Array, maxSize: number): Result<string> {
  const decoder = $newStrictUtf8Decoder();
  const parts: string[] = [];
  let totalBytes = 0;
  let strm: ZStream | undefined;

  try {
    const inflater = new Inflate({ windowBits: MAX_WINDOW_BITS, raw: false });
    inflater.onStart = (s: ZStream): void => {
      strm = s;
    };
    inflater.onData = (chunk: Uint8Array): void => {
      if (chunk.byteLength > maxSize - totalBytes) throw new InflateAbort("size");
      totalBytes += chunk.byteLength;
      try {
        parts.push(decoder.decode(chunk, { stream: true }));
      } catch (error) {
        throw new InflateAbort("decode", { cause: error });
      }
    };

    inflater.push(input, true);
    const endError = $checkInflateEnd(inflater, strm);
    if (endError !== undefined) return decompressErr(endError);
  } catch (error) {
    if (!(error instanceof InflateAbort)) return decompressErr($fmtError(error));
    return error.reason === "size" ? sizeLimitErr(maxSize) : decodeErr(error.cause);
  }

  try {
    parts.push(decoder.decode());
  } catch (error) {
    return decodeErr(error);
  }
  return $ok(parts.join(""));
}

export function $compressObj<T extends object = Record<string, unknown>>(
  obj: T,
  options: CompressOptions,
): Result<string> {
  const { result, error } = $stringifyObj(obj);
  if (error) return $err(error);
  return $compress(result, options);
}

export function $decompressObj<T extends object = Record<string, unknown>>(
  compressed: string,
  options: DecompressOptions,
): Result<{ result: T }> {
  const { result, error } = $decompress(compressed, options);
  if (error) return $err(error);
  return $parseToObj<T>(result);
}
