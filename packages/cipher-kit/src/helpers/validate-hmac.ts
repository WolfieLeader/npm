import { $convertStrToBytes, $err, $isIntIn, $isPlainObj, $isWellFormedStr, $ok, textEncoder } from "@internal/helpers";
import type { ErrResult, Result } from "@internal/helpers";
import { DIGEST_ALGORITHMS, MIN_HMAC_LENGTH } from "./consts.js";
import type { CipherEncoding, DigestAlgorithm, HmacOptions, VerifyHmacOptions } from "./types.js";
import {
  $cipherEncodingErr,
  $digestErr,
  $isCipherEncoding,
  $isDigestAlgorithm,
  $maxEncodedLength,
} from "./validate.js";

type DigestAlgo = (typeof DIGEST_ALGORITHMS)[DigestAlgorithm];

/** The data and key of an HMAC call as fresh bytes. The caller wipes `keyBytes` when done. */
interface HmacBytes {
  dataBytes: Uint8Array<ArrayBuffer>;
  keyBytes: Uint8Array<ArrayBuffer>;
}

export interface ValidatedHmac extends HmacBytes {
  digestAlgo: DigestAlgo;
  outputEncoding: CipherEncoding;
  length: number;
}

export interface ValidatedVerifyHmac extends HmacBytes {
  digestAlgo: DigestAlgo;
  length: number;
  /** The decoded presented MAC, or `null` when it does not decode to exactly `length` bytes. */
  presented: Uint8Array<ArrayBuffer> | null;
}

/** A copy of `x` as bytes: UTF-8 for a well-formed string, a copy for a `Uint8Array`, `null` for anything else. */
function $toBytes(x: unknown): Uint8Array<ArrayBuffer> | null {
  if (typeof x === "string") return $isWellFormedStr(x) ? textEncoder.encode(x) : null;
  if (x instanceof Uint8Array) return new Uint8Array(x);
  return null;
}

function $hmacBytes(data: unknown, key: unknown, ctx: string): Result<HmacBytes> {
  const dataBytes = $toBytes(data);
  if (dataBytes === null) {
    return $err({
      message: `${ctx}: Data must be a string or a Uint8Array`,
      description: "Received another type, or a string with lone UTF-16 surrogates",
    });
  }
  const keyBytes = $toBytes(key);
  if (keyBytes === null || keyBytes.byteLength === 0) {
    return $err({
      message: `${ctx}: Key must be a non-empty string or Uint8Array`,
      description: "Received an empty value, another type, or a string with lone UTF-16 surrogates",
    });
  }
  return $ok({ dataBytes, keyBytes });
}

/** Resolves the digest and MAC length shared by hmac and verifyHmac. */
function $resolveHmac(
  options: HmacOptions | VerifyHmacOptions,
  ctx: string,
): Result<{ digestAlgo: DigestAlgo; length: number }> {
  const digest = options.digest ?? "sha256";
  if (!$isDigestAlgorithm(digest)) return $digestErr(ctx);
  const digestAlgo = DIGEST_ALGORITHMS[digest];

  const length = options.length ?? digestAlgo.bytes;
  if (!$isIntIn(length, MIN_HMAC_LENGTH, digestAlgo.bytes)) {
    return $err({
      message: `${ctx}: Length must be from ${MIN_HMAC_LENGTH} bytes to the digest length`,
      description: `Use an integer from ${MIN_HMAC_LENGTH} to ${digestAlgo.bytes} for ${digest}`,
    });
  }
  return $ok({ digestAlgo, length });
}

function $optionsErr(ctx: string): ErrResult {
  return $err({
    message: `${ctx}: Options must be a plain object`,
    description: 'Pass an object like { digest: "sha256" }',
  });
}

/** Validates the input and options of `hmac()` and returns the data and key as fresh bytes. */
export function $validateHmac(data: unknown, key: unknown, options: unknown, prefix: string): Result<ValidatedHmac> {
  const ctx = `${prefix} hmac`;
  if (!$isPlainObj<HmacOptions>(options)) return $optionsErr(ctx);

  const resolved = $resolveHmac(options, ctx);
  if (resolved.error) return $err(resolved.error);

  const outputEncoding = options.outputEncoding ?? "base64url";
  if (!$isCipherEncoding(outputEncoding)) return $cipherEncodingErr(ctx, "output");

  const bytes = $hmacBytes(data, key, ctx);
  if (bytes.error) return $err(bytes.error);

  const { digestAlgo, length } = resolved;
  return $ok({ dataBytes: bytes.dataBytes, keyBytes: bytes.keyBytes, digestAlgo, outputEncoding, length });
}

/**
 * Decodes a presented MAC. The expected length comes from the options, never from the MAC itself:
 * a MAC that is too long to encode `length` bytes, does not decode, or decodes to another length gives `null`.
 */
function $decodeMac(mac: string, inputEncoding: CipherEncoding, length: number): Uint8Array<ArrayBuffer> | null {
  if (mac.length > $maxEncodedLength(length, inputEncoding)) return null;
  const decoded = $convertStrToBytes(mac, inputEncoding);
  if (decoded.error || decoded.result.byteLength !== length) return null;
  return decoded.result;
}

/** Arguments of `verifyHmac()`, grouped to keep the validator at three parameters. */
export interface VerifyHmacInput {
  data: unknown;
  mac: unknown;
  key: unknown;
}

/** Validates the input and options of `verifyHmac()` and decodes the presented MAC. */
export function $validateVerifyHmac(
  input: VerifyHmacInput,
  options: unknown,
  prefix: string,
): Result<ValidatedVerifyHmac> {
  const ctx = `${prefix} verifyHmac`;
  if (!$isPlainObj<VerifyHmacOptions>(options)) return $optionsErr(ctx);

  const resolved = $resolveHmac(options, ctx);
  if (resolved.error) return $err(resolved.error);

  const inputEncoding = options.inputEncoding ?? "base64url";
  if (!$isCipherEncoding(inputEncoding)) return $cipherEncodingErr(ctx, "input");

  if (typeof input.mac !== "string") {
    return $err({ message: `${ctx}: MAC must be a string`, description: "Pass the encoded MAC returned by hmac()" });
  }

  const bytes = $hmacBytes(input.data, input.key, ctx);
  if (bytes.error) return $err(bytes.error);

  const { digestAlgo, length } = resolved;
  const presented = $decodeMac(input.mac, inputEncoding, length);
  return $ok({ dataBytes: bytes.dataBytes, keyBytes: bytes.keyBytes, digestAlgo, length, presented });
}
