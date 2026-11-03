import { $err, $fmtError, $ok } from "@internal/helpers";
import type { Result } from "@internal/helpers";
import { $timingSafeEqual } from "~/helpers/compare.js";
import type { HmacOptions, VerifyHmacOptions } from "~/helpers/types.js";
import { $validateHmac, $validateVerifyHmac } from "~/helpers/validate-hmac.js";
import type { VerifyHmacInput } from "~/helpers/validate-hmac.js";
import { $convertBytesToStr } from "./web-encode.js";

async function $sign(
  dataBytes: Uint8Array<ArrayBuffer>,
  keyBytes: Uint8Array<ArrayBuffer>,
  hash: string,
): Promise<Uint8Array<ArrayBuffer>> {
  const cryptoKey = await globalThis.crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash }, false, ["sign"]);
  return new Uint8Array(await globalThis.crypto.subtle.sign("HMAC", cryptoKey, dataBytes));
}

export async function $hmac(data: unknown, key: unknown, options: HmacOptions): Promise<Result<string>> {
  const validated = $validateHmac(data, key, options, "web");
  if (validated.error) return $err(validated.error);
  const { dataBytes, keyBytes, digestAlgo, outputEncoding, length } = validated;

  let mac: Uint8Array | undefined;
  try {
    mac = await $sign(dataBytes, keyBytes, digestAlgo.web);
    return $convertBytesToStr(mac.subarray(0, length), outputEncoding);
  } catch (error) {
    return $err({ message: "web hmac: Failed to compute HMAC", description: $fmtError(error) });
  } finally {
    keyBytes.fill(0);
    mac?.fill(0);
  }
}

export async function $verifyHmac(input: VerifyHmacInput, options: VerifyHmacOptions): Promise<Result<boolean>> {
  const validated = $validateVerifyHmac(input, options, "web");
  if (validated.error) return $err(validated.error);
  const { dataBytes, keyBytes, digestAlgo, length, presented } = validated;

  let mac: Uint8Array | undefined;
  try {
    if (presented === null) return $ok(false);
    mac = await $sign(dataBytes, keyBytes, digestAlgo.web);
    return $ok($timingSafeEqual(mac.subarray(0, length), presented));
  } catch (error) {
    return $err({ message: "web verifyHmac: Verification failed", description: $fmtError(error) });
  } finally {
    keyBytes.fill(0);
    mac?.fill(0);
  }
}
