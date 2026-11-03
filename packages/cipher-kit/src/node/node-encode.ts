import { Buffer } from "node:buffer";
import {
  $err,
  $ok,
  $convertBytesToStr as $sharedBytesToStr,
  $convertStrToBytes as $sharedStrToBytes,
} from "@internal/helpers";
import type { Result } from "@internal/helpers";
import type { Encoding } from "~/helpers/types.js";
import { $encodingErr, $isEncoding } from "~/helpers/validate.js";

// Node uses the same strict codecs as Web, so both platforms accept and reject exactly the same input:
// strict UTF-8 (no U+FFFD substitution), latin1 code points <= 255 only, and canonical base64/base64url.

export function $convertStrToBytes(data: string, inputEncoding: Encoding = "utf8"): Result<{ result: Buffer }> {
  const { result, error } = $sharedStrToBytes(data, inputEncoding);
  if (error) return $err({ message: `node ${error.message}`, description: error.description });
  // Zero-copy view, so callers that wipe the Buffer also wipe the decoded bytes.
  return $ok({ result: Buffer.from(result.buffer, result.byteOffset, result.byteLength) });
}

export function $convertBytesToStr(data: Buffer, outputEncoding: Encoding = "utf8"): Result<string> {
  if (!(data instanceof Buffer)) {
    return $err({
      message: "node bytesToStr: Data must be a Buffer",
      description: "Received a non-Buffer value",
    });
  }
  // Buffer's encoders emit the same text as the shared ones and are faster; only UTF-8 decoding needs strict mode.
  if (outputEncoding !== "utf8" && $isEncoding(outputEncoding)) return $ok(data.toString(outputEncoding));
  const { result, error } = $sharedBytesToStr(data, outputEncoding);
  if (error) return $err({ message: `node ${error.message}`, description: error.description });
  return $ok(result);
}

export function $convertEncoding(data: string, from: Encoding, to: Encoding): Result<string> {
  if (typeof data !== "string") {
    return $err({
      message: "node convertEncoding: Data must be a string",
      description: "Received a non-string value",
    });
  }
  if (!$isEncoding(from) || !$isEncoding(to)) return $encodingErr("node convertEncoding");

  const bytes = $convertStrToBytes(data, from);
  if (bytes.error) return $err(bytes.error);

  const str = $convertBytesToStr(bytes.result, to);
  if (str.error) return $err(str.error);

  return $ok(str.result);
}
