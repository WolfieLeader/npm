import {
  tryConvertBytesToStr,
  tryConvertEncoding,
  tryConvertStrToBytes,
  tryParseToObj,
  tryStringifyObj,
} from "cipher-kit/web-api";
import pako, { type DeflateFunctionOptions } from "pako";
import { $err, $ok, $stringifyError, type Result } from "./error";
import { $isStr, isInCompressionFormat } from "./utils";

const COMPRESSION_OPTIONS: DeflateFunctionOptions = {
  level: 6,
  windowBits: 15,
  memLevel: 8,
  strategy: 0,
  raw: false,
};

export function compress(data: string): Result<string> {
  try {
    if (!$isStr(data)) return $err({ msg: "Empty string", desc: "Cannot compress null or undefined string" });

    const bytes = tryConvertStrToBytes(data, "utf8");
    if (bytes.error) return $err({ msg: bytes.error.message, desc: bytes.error.description });

    const encoded = tryConvertEncoding(data, "utf8", "base64url");
    if (encoded.error) return $err({ msg: encoded.error.message, desc: encoded.error.description });

    const uncompressed = `${encoded.result}.0.`;
    const compressed = tryConvertBytesToStr(pako.deflate(bytes.result, COMPRESSION_OPTIONS), "base64url");
    if (compressed.error) return $err({ msg: compressed.error.message, desc: compressed.error.description });

    if (uncompressed.length <= compressed.result.length) return $ok(uncompressed);
    return $ok(`${compressed.result}.1.`);
  } catch (error) {
    return $err({ msg: "Compression error", desc: $stringifyError(error) });
  }
}

export function decompress(data: string): Result<string> {
  try {
    if (!isInCompressionFormat(data)) {
      return $err({ msg: "Invalid format", desc: "String does not match expected compressed format" });
    }

    const str = data.slice(0, -3);
    if (!$isStr(str, 1)) return $err({ msg: "Invalid input", desc: "Input is not a valid string" });

    const bytes = tryConvertStrToBytes(str, "base64url");
    if (bytes.error) return $err({ msg: bytes.error.message, desc: bytes.error.description });

    if (data.endsWith(".1.")) {
      return $ok(pako.inflate(bytes.result, { to: "string" }));
    }

    if (data.endsWith(".0.")) {
      const out = tryConvertEncoding(str, "base64url", "utf8");
      if (out.error) return $err({ msg: out.error.message, desc: out.error.description });
      return $ok(out.result);
    }

    return $err({ msg: "Invalid compression type", desc: "Expected .0. or .1. at the end of the string" });
  } catch (error) {
    return $err({ msg: "Decompression error", desc: $stringifyError(error) });
  }
}

export function compressObj(data: Record<string, unknown>): Result<string> {
  const { result, error } = tryStringifyObj(data);
  if (error) return $err({ msg: error.message, desc: error.description });

  return compress(result);
}

export function decompressObj(data: string): Result<{ result: Record<string, unknown> }> {
  const { result, error } = decompress(data);
  if (error) return $err(error);

  const obj = tryParseToObj(result);
  if (obj.error) return $err({ msg: obj.error.message, desc: obj.error.description });

  return $ok({ result: obj.result });
}
