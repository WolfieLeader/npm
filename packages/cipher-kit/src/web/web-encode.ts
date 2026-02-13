import {
  $err,
  $isStr,
  $ok,
  $convertBytesToStr as $sharedBytesToStr,
  $convertStrToBytes as $sharedStrToBytes,
  type Result,
} from "@internal/helpers";
import { ENCODING } from "~/helpers/consts.js";
import type { Encoding } from "~/helpers/types.js";

export { textDecoder, textEncoder } from "@internal/helpers";

export function $convertStrToBytes(
  data: string,
  inputEncoding: Encoding = "utf8",
): Result<{ result: Uint8Array<ArrayBuffer> }> {
  const result = $sharedStrToBytes(data, inputEncoding);
  if (result.error) {
    return $err({
      message: result.error.message.replace("strToBytes:", "web strToBytes:"),
      description: result.error.description,
    });
  }
  return result;
}

export function $convertBytesToStr(data: Uint8Array | ArrayBuffer, outputEncoding: Encoding = "utf8"): Result<string> {
  const result = $sharedBytesToStr(data, outputEncoding);
  if (result.error) {
    return $err({
      message: result.error.message.replace("bytesToStr:", "web bytesToStr:"),
      description: result.error.description,
    });
  }
  return result;
}

export function $convertEncoding(data: string, from: Encoding, to: Encoding): Result<string> {
  if (!$isStr(data)) {
    return $err({
      message: "web convertEncoding: Data must be a non-empty string",
      description: "Received empty or non-string value",
    });
  }
  if (!ENCODING.includes(from) || !ENCODING.includes(to)) {
    return $err({
      message: `web convertEncoding: Unsupported encoding: from ${from} to ${to}`,
      description: "Use base64, base64url, hex, utf8, or latin1",
    });
  }

  const bytes = $convertStrToBytes(data, from);
  if (bytes.error) return $err(bytes.error);

  const str = $convertBytesToStr(bytes.result, to);
  if (str.error) return $err(str.error);

  return $ok(str.result);
}
