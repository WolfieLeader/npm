import { Buffer } from "node:buffer";
import { $err, $fmtError, $isStr, $ok, type Result } from "@internal/helpers";
import { ENCODING } from "~/helpers/consts.js";
import type { Encoding } from "~/helpers/types.js";

export function $convertStrToBytes(data: string, inputEncoding: Encoding = "utf8"): Result<{ result: Buffer }> {
  if (typeof data !== "string") {
    return $err({
      message: "node strToBytes: Data must be a string",
      description: `Expected a string value, received ${typeof data}`,
    });
  }
  if (!ENCODING.includes(inputEncoding)) {
    return $err({
      message: `node strToBytes: Unsupported encoding: ${inputEncoding}`,
      description: "Use base64, base64url, hex, utf8, or latin1",
    });
  }
  if (inputEncoding === "hex") {
    const clean = /^0x/i.test(data) ? data.slice(2) : data;
    if (clean.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(clean)) {
      return $err({
        message: "node strToBytes: Invalid hex string",
        description: "Hex string contains non-hex characters or has odd length",
      });
    }
    return $ok({ result: Buffer.from(clean, "hex") });
  }
  if (inputEncoding === "base64") {
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}={2}|[A-Za-z0-9+/]{3}=)?$/.test(data)) {
      return $err({
        message: "node strToBytes: Invalid base64 string",
        description: "Base64 string contains invalid characters or has incorrect padding",
      });
    }
  }
  if (inputEncoding === "base64url") {
    if (!/^[A-Za-z0-9_-]*={0,2}$/.test(data) || data.replace(/=+$/, "").length % 4 === 1) {
      return $err({
        message: "node strToBytes: Invalid base64url string",
        description: "Base64url string contains invalid characters or has incorrect length",
      });
    }
  }
  try {
    return $ok({ result: Buffer.from(data, inputEncoding) });
  } catch (error) {
    return $err({ message: "node strToBytes: Failed to convert data", description: $fmtError(error) });
  }
}

export function $convertBytesToStr(data: Buffer, outputEncoding: Encoding = "utf8"): Result<string> {
  if (!(data instanceof Buffer)) {
    return $err({
      message: "node bytesToStr: Data must be a Buffer",
      description: "Received a non-Buffer value",
    });
  }
  if (!ENCODING.includes(outputEncoding)) {
    return $err({
      message: `node bytesToStr: Unsupported encoding: ${outputEncoding}`,
      description: "Use base64, base64url, hex, utf8, or latin1",
    });
  }
  try {
    return $ok(data.toString(outputEncoding));
  } catch (error) {
    return $err({ message: "node bytesToStr: Failed to convert data", description: $fmtError(error) });
  }
}

export function $convertEncoding(data: string, from: Encoding, to: Encoding): Result<string> {
  if (!$isStr(data)) {
    return $err({
      message: "node convertEncoding: Data must be a non-empty string",
      description: "Received empty or non-string value",
    });
  }

  if (!ENCODING.includes(from) || !ENCODING.includes(to)) {
    return $err({
      message: `node convertEncoding: Unsupported encoding: from ${from} to ${to}`,
      description: "Use base64, base64url, hex, utf8, or latin1",
    });
  }

  const bytes = $convertStrToBytes(data, from);
  if (bytes.error) return $err(bytes.error);

  const str = $convertBytesToStr(bytes.result, to);
  if (str.error) return $err(str.error);

  return $ok(str.result);
}
