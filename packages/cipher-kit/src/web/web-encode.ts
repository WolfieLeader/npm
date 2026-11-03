import {
  $err,
  $ok,
  $convertBytesToStr as $sharedBytesToStr,
  $convertStrToBytes as $sharedStrToBytes,
} from "@internal/helpers";
import type { Result } from "@internal/helpers";
import type { Encoding } from "~/helpers/types.js";
import { $encodingErr, $isEncoding } from "~/helpers/validate.js";

export { textEncoder } from "@internal/helpers";

export function $convertStrToBytes(
  data: string,
  inputEncoding: Encoding = "utf8",
): Result<{ result: Uint8Array<ArrayBuffer> }> {
  const result = $sharedStrToBytes(data, inputEncoding);
  if (result.error) return $err({ message: `web ${result.error.message}`, description: result.error.description });
  return result;
}

export function $convertBytesToStr(data: Uint8Array | ArrayBuffer, outputEncoding: Encoding = "utf8"): Result<string> {
  const result = $sharedBytesToStr(data, outputEncoding);
  if (result.error) return $err({ message: `web ${result.error.message}`, description: result.error.description });
  return result;
}

export function $convertEncoding(data: string, from: Encoding, to: Encoding): Result<string> {
  if (typeof data !== "string") {
    return $err({
      message: "web convertEncoding: Data must be a string",
      description: "Received a non-string value",
    });
  }
  if (!$isEncoding(from) || !$isEncoding(to)) return $encodingErr("web convertEncoding");

  const bytes = $convertStrToBytes(data, from);
  if (bytes.error) return $err(bytes.error);

  const str = $convertBytesToStr(bytes.result, to);
  if (str.error) return $err(str.error);

  return $ok(str.result);
}
