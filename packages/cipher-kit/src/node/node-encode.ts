import { Buffer } from "node:buffer";
import { ENCODING } from "~/helpers/consts.js";
import { $err, $fmtError, $ok, type Result } from "~/helpers/error.js";
import type { Encoding } from "~/helpers/types.js";
import { $isStr } from "~/helpers/validate.js";

export function $convertStrToBytes(data: string, inputEncoding: Encoding = "utf8"): Result<{ result: Buffer }> {
  if (!$isStr(data)) {
    return $err({
      msg: "Crypto NodeJS API - String to Bytes: Empty data",
      desc: "Data must be a non-empty string",
    });
  }
  if (!ENCODING.includes(inputEncoding)) {
    return $err({
      msg: `Crypto NodeJS API - String to Bytes: Unsupported encoding: ${inputEncoding}`,
      desc: "Use base64, base64url, hex, utf8, or latin1",
    });
  }
  try {
    return $ok({ result: Buffer.from(data, inputEncoding) });
  } catch (error) {
    return $err({ msg: "Crypto NodeJS API - String to Bytes: Failed to convert data", desc: $fmtError(error) });
  }
}

export function $convertBytesToStr(data: Buffer, outputEncoding: Encoding = "utf8"): Result<string> {
  if (!(data instanceof Buffer)) {
    return $err({
      msg: "Crypto NodeJS API - Bytes to String: Invalid data type",
      desc: "Data must be a Buffer",
    });
  }
  if (!ENCODING.includes(outputEncoding)) {
    return $err({
      msg: `Crypto NodeJS API - Bytes to String: Unsupported encoding: ${outputEncoding}`,
      desc: "Use base64, base64url, hex, utf8, or latin1",
    });
  }
  try {
    return $ok(data.toString(outputEncoding));
  } catch (error) {
    return $err({ msg: "Crypto NodeJS API - Bytes to String: Failed to convert data", desc: $fmtError(error) });
  }
}

export function $convertEncoding(data: string, from: Encoding, to: Encoding): Result<string> {
  if (!$isStr(data)) {
    return $err({
      msg: "Crypto NodeJS API - Convert Format: Empty data",
      desc: "Data must be a non-empty string",
    });
  }

  if (!ENCODING.includes(from) || !ENCODING.includes(to)) {
    return $err({
      msg: `Crypto NodeJS API - Convert Format: Unsupported encoding: from ${from} to ${to}`,
      desc: "Use base64, base64url, hex, utf8, or latin1",
    });
  }

  const bytes = $convertStrToBytes(data, from);
  if (bytes.error) return $err({ msg: bytes.error.message, desc: bytes.error.description });

  const str = $convertBytesToStr(bytes.result, to);
  if (str.error) return $err({ msg: str.error.message, desc: str.error.description });

  return $ok({ result: str.result });
}
