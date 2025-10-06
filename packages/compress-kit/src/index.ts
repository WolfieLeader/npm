import pako, { type DeflateFunctionOptions } from "pako";
import { $convertBytesToStr, $convertStrToBytes } from "./helpers/encode";
import { $err, $fmtError, $ok, type Result } from "./helpers/error";
import { $parseToObj, $stringifyObj } from "./helpers/object";
import { $isStr } from "./helpers/validate";

const COMPRESSION_OPTIONS: DeflateFunctionOptions = {
  level: 6,
  windowBits: 15,
  memLevel: 8,
  strategy: 0,
  raw: false,
};

function $compress(data: string): Result<string> {
  try {
    if (!$isStr(data)) return $err({ msg: "Empty string", desc: "Cannot compress null or undefined string" });

    const bytes = $convertStrToBytes(data, "utf8");
    if (bytes.error) return $err(bytes.error);

    const encoded = $convertBytesToStr(bytes.result, "base64url");
    if (encoded.error) return $err(encoded.error);

    const compressed = $convertBytesToStr(pako.deflate(bytes.result, COMPRESSION_OPTIONS), "base64url");
    if (compressed.error) return $err(compressed.error);

    if (encoded.result.length <= compressed.result.length) {
      return $ok(`${encoded.result}.0.`);
    }

    return $ok(`${compressed.result}.1.`);
  } catch (error) {
    return $err({ msg: "Compression error", desc: $fmtError(error) });
  }
}

function $decompress(data: string): Result<string> {
  try {
    if (!$isStr(data, 4) || (!data.endsWith(".0.") && !data.endsWith(".1."))) {
      return $err({ msg: "Invalid format", desc: "String does not match expected compressed format" });
    }

    const bytes = $convertStrToBytes(data.slice(0, -3), "base64url");
    if (bytes.error) return $err({ msg: bytes.error.message, desc: bytes.error.description });

    if (data.endsWith(".1.")) {
      return $ok(pako.inflate(bytes.result, { to: "string" }));
    }

    const str = $convertBytesToStr(bytes.result, "utf8");
    if (str.error) return $err({ msg: str.error.message, desc: str.error.description });

    return $ok(str.result);
  } catch (error) {
    return $err({ msg: "Decompression error", desc: $fmtError(error) });
  }
}

export function $compressObj<T extends object = Record<string, unknown>>(data: T): Result<string> {
  const { result, error } = $stringifyObj(data);
  if (error) return $err(error);
  return $compress(result);
}

export function $decompressObj<T extends object = Record<string, unknown>>(data: string): Result<{ result: T }> {
  const { result, error } = $decompress(data);
  if (error) return $err(error);
  return $parseToObj<T>(result);
}
