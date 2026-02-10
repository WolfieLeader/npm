import { $convertBytesToStr as $sharedBytesToStr, $convertStrToBytes as $sharedStrToBytes } from "@internal/helpers";
import { ENCODING } from "~/helpers/consts.js";
import { $err, $ok, type Result } from "~/helpers/error.js";
import type { Encoding } from "~/helpers/types.js";
import { $isStr } from "~/helpers/validate.js";

export {
  $convertBytesToStr,
  $convertStrToBytes,
  textDecoder,
  textEncoder,
} from "@internal/helpers";

export function $convertEncoding(data: string, from: Encoding, to: Encoding): Result<string> {
  if (!$isStr(data)) {
    return $err({
      msg: "Crypto Web API - Convert Format: Empty data",
      desc: "Data must be a non-empty string",
    });
  }
  if (!ENCODING.includes(from) || !ENCODING.includes(to)) {
    return $err({
      msg: `Crypto Web API - Convert Format: Unsupported encoding: from ${from} to ${to}`,
      desc: "Use base64, base64url, hex, utf8, or latin1",
    });
  }

  const bytes = $sharedStrToBytes(data, from);
  if (bytes.error) return $err({ msg: bytes.error.message, desc: bytes.error.description });

  const str = $sharedBytesToStr(bytes.result, to);
  if (str.error) return $err({ msg: str.error.message, desc: str.error.description });

  return $ok({ result: str.result });
}
