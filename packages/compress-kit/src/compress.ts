import { decode, encode, parseToObj, stringifyObj } from "cipher-kit/web-api";
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

    const encoded = encode(data, "utf8");
    if (encoded.error) return $err({ msg: encoded.error.message, desc: encoded.error.description });

    const decoded = decode(encoded.bytes, "base64url");
    if (decoded.error) return $err({ msg: decoded.error.message, desc: decoded.error.description });

    const compressed = decode(pako.deflate(encoded.bytes, COMPRESSION_OPTIONS), "base64url");
    if (compressed.error) return $err({ msg: compressed.error.message, desc: compressed.error.description });

    if (decoded.result.length <= compressed.result.length) return $ok(`${decoded.result}.0.`);
    return $ok(`${compressed.result}.1.`);
  } catch (error) {
    return $err({ msg: "Compression error", desc: $stringifyError(error) });
  }
}

export function decompress(data: string): Result<string> {
  try {
    if (isInCompressionFormat(data) === false) {
      return $err({ msg: "Invalid format", desc: "String does not match expected compressed format" });
    }

    const str = data.slice(0, -3);
    if (!$isStr(str, 1)) return $err({ msg: "Invalid input", desc: "Input is not a valid string" });

    const encoded = encode(str, "base64url");
    if (encoded.error) return $err({ msg: encoded.error.message, desc: encoded.error.description });

    if (data.endsWith(".1.")) {
      return $ok(pako.inflate(encoded.bytes, { to: "string" }));
    }

    if (data.endsWith(".0.")) {
      const decoded = decode(encoded.bytes, "utf8");
      if (decoded.error) return $err({ msg: decoded.error.message, desc: decoded.error.description });
      return $ok(decoded.result);
    }

    return $err({ msg: "Invalid compression type", desc: "Expected .0. or .1. at the end of the string" });
  } catch (error) {
    return $err({ msg: "Decompression error", desc: $stringifyError(error) });
  }
}

export function compressObj(data: Record<string, unknown>): Result<string> {
  const { result, error } = stringifyObj(data);
  if (error) return $err(error);
  return compress(result);
}

export function decompressObj(data: string): Result<{ result: Record<string, unknown> }> {
  const { result, error } = decompress(data);
  if (error) return $err(error);
  return parseToObj(result);
}
