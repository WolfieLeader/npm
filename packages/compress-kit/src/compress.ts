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
  textDecoder,
} from "@internal/helpers";
import pako from "pako";
import type { CompressOptions, DecompressOptions, EightToFifteen, OneToNine } from "./types.js";

const STRATEGIES = Object.freeze({
  default: pako.constants.Z_DEFAULT_STRATEGY,
  filtered: pako.constants.Z_FILTERED,
  huffmanOnly: pako.constants.Z_HUFFMAN_ONLY,
  rle: pako.constants.Z_RLE,
  fixed: pako.constants.Z_FIXED,
} as const);

export function $compress(data: string, options: CompressOptions): Result<string> {
  if (!$isStr(data)) {
    return $err({ msg: "Compression: Empty string", desc: "Cannot compress null or undefined string" });
  }

  if (!$isPlainObj<CompressOptions>(options)) {
    return $err({ msg: "Compression: Invalid options", desc: "Options is not a plain object" });
  }

  const outputEncoding = options.outputEncoding ?? "base64url";
  if (!CIPHER_ENCODING.includes(outputEncoding)) {
    return $err({
      msg: "Compression: Invalid output encoding",
      desc: `Output encoding must be one of: ${CIPHER_ENCODING.join(", ")}`,
    });
  }

  const level = options.level ?? 6;
  if (!$isIntIn<OneToNine>(level, 1, 9)) {
    return $err({ msg: "Compression: Invalid level", desc: "Level must be an integer between 1 and 9" });
  }

  const windowBits = options.windowBits ?? 15;
  if (!$isIntIn<EightToFifteen>(windowBits, 8, 15)) {
    return $err({ msg: "Compression: Invalid windowBits", desc: "windowBits must be an integer between 8 and 15" });
  }

  const memLevel = options.memLevel ?? 8;
  if (!$isIntIn<OneToNine>(memLevel, 1, 9)) {
    return $err({ msg: "Compression: Invalid memLevel", desc: "memLevel must be an integer between 1 and 9" });
  }

  const strategyName = options.strategy ?? "default";
  if (!$isStr(strategyName) || !(strategyName in STRATEGIES)) {
    return $err({
      msg: "Compression: Invalid strategy",
      desc: `Strategy must be one of: ${Object.keys(STRATEGIES).join(", ")}`,
    });
  }
  const strategy = STRATEGIES[strategyName as keyof typeof STRATEGIES];

  const bytes = $convertStrToBytes(data, "utf8");
  if (bytes.error) return $err(bytes.error);

  const encoded = $convertBytesToStr(bytes.result, outputEncoding);
  if (encoded.error) return $err(encoded.error);

  try {
    const compressedBytes = pako.deflate(bytes.result, {
      level: level,
      windowBits: windowBits,
      memLevel: memLevel,
      strategy: strategy,
      raw: false,
    });

    const compressed = $convertBytesToStr(compressedBytes, outputEncoding);
    if (compressed.error) return $err(compressed.error);

    if (encoded.result.length <= compressed.result.length) {
      return $ok(`${encoded.result}.0.`);
    }

    return $ok(`${compressed.result}.1.`);
  } catch (error) {
    return $err({ msg: "Compression: Failed to compress data", desc: $fmtError(error) });
  }
}

export function $decompress(compressed: string, options: DecompressOptions): Result<string> {
  if (!$isStr(compressed, 4) || (!compressed.endsWith(".0.") && !compressed.endsWith(".1."))) {
    return $err({ msg: "Decompression: Invalid format", desc: "String does not match expected compressed format" });
  }

  if (!$isPlainObj<DecompressOptions>(options)) {
    return $err({ msg: "Decompression: Invalid options", desc: "Options is not a plain object" });
  }

  const inputEncoding = options.inputEncoding ?? "base64url";
  if (!CIPHER_ENCODING.includes(inputEncoding)) {
    return $err({
      msg: "Decompression: Invalid input encoding",
      desc: `Input encoding must be one of: ${CIPHER_ENCODING.join(", ")}`,
    });
  }

  const windowBits = options.windowBits ?? 15;
  if (!$isIntIn<EightToFifteen>(windowBits, 8, 15)) {
    return $err({ msg: "Decompression: Invalid windowBits", desc: "windowBits must be an integer between 8 and 15" });
  }

  const bytes = $convertStrToBytes(compressed.slice(0, -3), inputEncoding);
  if (bytes.error) return $err(bytes.error);

  if (compressed.endsWith(".0.")) {
    return $convertBytesToStr(bytes.result, "utf8");
  }

  try {
    if (options.maxOutputSize) {
      const maxSize = options.maxOutputSize;
      const inflater = new pako.Inflate({ windowBits: windowBits, raw: false });
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;
      let exceeded = false;

      inflater.onData = (chunk: Uint8Array) => {
        if (exceeded) return;
        totalBytes += chunk.length;
        if (totalBytes > maxSize) {
          exceeded = true;
          return;
        }
        chunks.push(chunk);
      };

      inflater.push(bytes.result, true);

      if (exceeded) {
        return $err({
          msg: "Decompression: Output exceeds size limit",
          desc: `Decompressed output exceeds maxOutputSize (${options.maxOutputSize} bytes)`,
        });
      }

      if (inflater.err) {
        return $err({ msg: "Decompression: Failed to decompress data", desc: inflater.msg || "Unknown inflate error" });
      }

      const total = chunks.reduce((sum, c) => sum + c.length, 0);
      const output = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        output.set(chunk, offset);
        offset += chunk.length;
      }

      return $ok(textDecoder.decode(output));
    }

    const result = pako.inflate(bytes.result, { to: "string", windowBits: windowBits, raw: false });
    return $ok(result);
  } catch (error) {
    return $err({ msg: "Decompression: Failed to decompress data", desc: $fmtError(error) });
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
