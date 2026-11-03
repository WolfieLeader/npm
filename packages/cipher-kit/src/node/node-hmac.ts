import type { Buffer } from "node:buffer";
import nodeCrypto from "node:crypto";
import { $err, $fmtError, $ok } from "@internal/helpers";
import type { Result } from "@internal/helpers";
import type { HmacOptions, VerifyHmacOptions } from "~/helpers/types.js";
import { $validateHmac, $validateVerifyHmac } from "~/helpers/validate-hmac.js";
import type { VerifyHmacInput } from "~/helpers/validate-hmac.js";
import { $convertBytesToStr } from "./node-encode.js";

export function $hmac(data: unknown, key: unknown, options: HmacOptions): Result<string> {
  const validated = $validateHmac(data, key, options, "node");
  if (validated.error) return $err(validated.error);
  const { dataBytes, keyBytes, digestAlgo, outputEncoding, length } = validated;

  let mac: Buffer | undefined;
  try {
    mac = nodeCrypto.createHmac(digestAlgo.node, keyBytes).update(dataBytes).digest();
    return $convertBytesToStr(mac.subarray(0, length), outputEncoding);
  } catch (error) {
    return $err({ message: "node hmac: Failed to compute HMAC", description: $fmtError(error) });
  } finally {
    keyBytes.fill(0);
    mac?.fill(0);
  }
}

export function $verifyHmac(input: VerifyHmacInput, options: VerifyHmacOptions): Result<boolean> {
  const validated = $validateVerifyHmac(input, options, "node");
  if (validated.error) return $err(validated.error);
  const { dataBytes, keyBytes, digestAlgo, length, presented } = validated;

  let mac: Buffer | undefined;
  try {
    if (presented === null) return $ok(false);
    mac = nodeCrypto.createHmac(digestAlgo.node, keyBytes).update(dataBytes).digest();
    return $ok(nodeCrypto.timingSafeEqual(mac.subarray(0, length), presented));
  } catch (error) {
    return $err({ message: "node verifyHmac: Verification failed", description: $fmtError(error) });
  } finally {
    keyBytes.fill(0);
    mac?.fill(0);
  }
}
