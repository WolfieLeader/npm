import {
  $convertBytesToStr,
  $convertStrToBytes,
  $err,
  $fmtError,
  $isIntIn,
  $isPlainObj,
  $isStr,
  $ok,
  $parseToObj,
  $stringifyObj,
  CIPHER_ENCODING,
  type Result,
} from "@internal/helpers";
import pako from "pako";
import type { CompressEncoding, CompressOptions, DecompressOptions, EightToFifteen, OneToNine } from "./types.js";

const STRATEGIES = Object.freeze({
  default: pako.constants.Z_DEFAULT_STRATEGY,
  filtered: pako.constants.Z_FILTERED,
  huffmanOnly: pako.constants.Z_HUFFMAN_ONLY,
  rle: pako.constants.Z_RLE,
  fixed: pako.constants.Z_FIXED,
} as const);

function $estimateDecodedByteLength(data: string, encoding: CompressEncoding): number | null {
  if (encoding === "hex") {
    if (data.length % 2 !== 0) return null;
    return data.length / 2;
  }

  if (encoding === "base64") {
    if (data.length % 4 !== 0) return null;
    const padding = data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0;
    return (data.length / 4) * 3 - padding;
  }

  const stripped = data.replace(/=+$/, "");
  if (stripped.length % 4 === 1) return null;
  const pad = (4 - (stripped.length % 4)) % 4;
  return ((stripped.length + pad) / 4) * 3 - pad;
}

export function $compress(data: string, options: CompressOptions): Result<string> {
  if (!$isStr(data)) {
    return $err({
      message: "compress: Data must be a non-empty string",
      description: "Provide a non-empty, non-whitespace string to compress",
    });
  }

  if (!$isPlainObj<CompressOptions>(options)) {
    return $err({
      message: "compress: Options must be a plain object",
      description: "Pass a plain object ({...}) as the options argument",
    });
  }

  const outputEncoding = options.outputEncoding ?? "base64url";
  if (!CIPHER_ENCODING.includes(outputEncoding)) {
    return $err({
      message: `compress: Unsupported output encoding: ${outputEncoding}`,
      description: "Use base64, base64url, or hex",
    });
  }

  const level = options.level ?? 6;
  if (!$isIntIn<OneToNine>(level, 1, 9)) {
    return $err({
      message: `compress: Invalid level: ${level}`,
      description: "Level must be an integer between 1 and 9",
    });
  }

  const windowBits = options.windowBits ?? 15;
  if (!$isIntIn<EightToFifteen>(windowBits, 8, 15)) {
    return $err({
      message: `compress: Invalid windowBits: ${windowBits}`,
      description: "windowBits must be an integer between 8 and 15",
    });
  }

  const memLevel = options.memLevel ?? 8;
  if (!$isIntIn<OneToNine>(memLevel, 1, 9)) {
    return $err({
      message: `compress: Invalid memLevel: ${memLevel}`,
      description: "memLevel must be an integer between 1 and 9",
    });
  }

  const strategyName = options.strategy ?? "default";
  if (!$isStr(strategyName) || !Object.hasOwn(STRATEGIES, strategyName)) {
    return $err({
      message: `compress: Invalid strategy: ${strategyName}`,
      description: `Strategy must be one of: ${Object.keys(STRATEGIES).join(", ")}`,
    });
  }
  const strategy = STRATEGIES[strategyName as keyof typeof STRATEGIES];

  const bytes = $convertStrToBytes(data, "utf8");
  if (bytes.error) return $err(bytes.error);

  try {
    const compressedBytes = pako.deflate(bytes.result, { level, windowBits, memLevel, strategy, raw: false });

    if (bytes.result.byteLength <= compressedBytes.byteLength) {
      const encoded = $convertBytesToStr(bytes.result, outputEncoding);
      if (encoded.error) return $err(encoded.error);
      return $ok(`${encoded.result}.0.`);
    }

    const compressed = $convertBytesToStr(compressedBytes, outputEncoding);
    if (compressed.error) return $err(compressed.error);
    return $ok(`${compressed.result}.1.`);
  } catch (error) {
    return $err({ message: "compress: Failed to compress data", description: $fmtError(error) });
  }
}

export function $decompress(compressed: string, options: DecompressOptions): Result<string> {
  if (!$isStr(compressed, 4) || (!compressed.endsWith(".0.") && !compressed.endsWith(".1."))) {
    return $err({
      message: "decompress: Invalid compressed data format",
      description: "Data must end with '.0.' or '.1.' suffix",
    });
  }

  if (!$isPlainObj<DecompressOptions>(options)) {
    return $err({
      message: "decompress: Options must be a plain object",
      description: "Pass a plain object ({...}) as the options argument",
    });
  }

  const inputEncoding = options.inputEncoding ?? "base64url";
  if (!CIPHER_ENCODING.includes(inputEncoding)) {
    return $err({
      message: `decompress: Unsupported input encoding: ${inputEncoding}`,
      description: "Use base64, base64url, or hex",
    });
  }

  const windowBits = options.windowBits ?? 15;
  if (!$isIntIn<EightToFifteen>(windowBits, 8, 15)) {
    return $err({
      message: `decompress: Invalid windowBits: ${windowBits}`,
      description: "windowBits must be an integer between 8 and 15",
    });
  }

  if (options.maxOutputSize != null && options.maxOutputSize !== 0) {
    if (!$isIntIn(options.maxOutputSize, 1, Number.MAX_SAFE_INTEGER)) {
      return $err({
        message: "decompress: Invalid maxOutputSize",
        description: "maxOutputSize must be a positive integer",
      });
    }
  }
  const maxSize = options.maxOutputSize ?? 0;
  const payload = compressed.slice(0, -3);

  if (compressed.endsWith(".0.") && maxSize > 0) {
    const estimated = $estimateDecodedByteLength(payload, inputEncoding);
    if (estimated != null && estimated > maxSize) {
      return $err({
        message: "decompress: Output exceeds size limit",
        description: `Decompressed output exceeds maxOutputSize (${maxSize} bytes)`,
      });
    }
  }

  const bytes = $convertStrToBytes(payload, inputEncoding);
  if (bytes.error) return $err(bytes.error);

  if (compressed.endsWith(".0.")) {
    if (maxSize > 0 && bytes.result.byteLength > maxSize) {
      return $err({
        message: "decompress: Output exceeds size limit",
        description: `Decompressed output exceeds maxOutputSize (${maxSize} bytes)`,
      });
    }
    return $convertBytesToStr(bytes.result, "utf8");
  }

  if (maxSize > 0) {
    const inflater = new pako.Inflate({ windowBits, raw: false });
    const decoder = new TextDecoder("utf-8", { fatal: true });
    const parts: string[] = [];
    let totalBytes = 0;
    let exceeded = false;

    inflater.onData = (chunk: Uint8Array) => {
      if (exceeded) return;
      if (chunk.length > maxSize - totalBytes) {
        exceeded = true;
        throw new Error("EXCEEDED");
      }
      totalBytes += chunk.length;
      parts.push(decoder.decode(chunk, { stream: true }));
    };

    try {
      inflater.push(bytes.result, true);
    } catch (error) {
      try {
        decoder.decode();
      } catch {}
      if (exceeded) {
        return $err({
          message: "decompress: Output exceeds size limit",
          description: `Decompressed output exceeds maxOutputSize (${maxSize} bytes)`,
        });
      }
      return $err({ message: "decompress: Failed to decompress data", description: $fmtError(error) });
    }

    if (inflater.err) {
      return $err({
        message: "decompress: Failed to decompress data",
        description: inflater.msg || "Unknown inflate error",
      });
    }

    try {
      parts.push(decoder.decode());
    } catch (error) {
      return $err({ message: "decompress: Failed to decode output", description: $fmtError(error) });
    }
    return $ok(parts.join(""));
  }

  try {
    const inflated = pako.inflate(bytes.result, { windowBits, raw: false });
    return $convertBytesToStr(inflated, "utf8");
  } catch (error) {
    return $err({ message: "decompress: Failed to decompress data", description: $fmtError(error) });
  }
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
