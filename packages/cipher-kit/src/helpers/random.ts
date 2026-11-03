import { $convertBytesToStr, $err, $fmtError, $isIntIn, $isPlainObj, $ok, $toHex } from "@internal/helpers";
import type { Result } from "@internal/helpers";
import {
  MAX_RANDOM_CODE_DIGITS,
  MAX_RANDOM_TOKEN_BYTES,
  MIN_RANDOM_CODE_DIGITS,
  MIN_RANDOM_TOKEN_BYTES,
} from "./consts.js";
import type { GenerateUuidOptions } from "./types.js";
import { $cipherEncodingErr, $isCipherEncoding } from "./validate.js";

/** Fills `bytes` with cryptographically secure random bytes: `randomFillSync` on Node, `getRandomValues` on Web. */
export type FillRandom = (bytes: Uint8Array<ArrayBuffer>) => void;

const UINT32_RANGE = 2 ** 32;
const UUID_V7_MAX_MS = 2 ** 48 - 1;

/** Encodes `bytes` random bytes. */
export function $randomToken(bytes: unknown, encoding: unknown, fill: FillRandom, prefix: string): Result<string> {
  const ctx = `${prefix} randomToken`;
  if (!$isIntIn<number>(bytes, MIN_RANDOM_TOKEN_BYTES, MAX_RANDOM_TOKEN_BYTES)) {
    return $err({
      message: `${ctx}: Bytes must be an integer from ${MIN_RANDOM_TOKEN_BYTES} to ${MAX_RANDOM_TOKEN_BYTES}`,
      description: "Use 32 bytes (256 bits) or more for session and API tokens",
    });
  }
  if (!$isCipherEncoding(encoding)) return $cipherEncodingErr(ctx, "output");

  const random = new Uint8Array(bytes);
  try {
    fill(random);
    return $convertBytesToStr(random, encoding);
  } catch (error) {
    return $err({ message: `${ctx}: Failed to generate random bytes`, description: $fmtError(error) });
  } finally {
    random.fill(0);
  }
}

/**
 * The number of Uint32 values that map uniformly onto `range`: the largest multiple of `range` up to 2^32.
 * A draw at or above it is redrawn, so `draw % range` gives every result the same probability.
 */
export function $rejectionLimit(range: number): number {
  return UINT32_RANGE - (UINT32_RANGE % range);
}

/** A uniformly random number from 0 to `range - 1`, by rejection sampling over Uint32 draws. */
function $uniformBelow(range: number, fill: FillRandom): number {
  const limit = $rejectionLimit(range);
  const word = new Uint32Array(1);
  const view = new Uint8Array(word.buffer);
  let draw = UINT32_RANGE;
  while (draw >= limit) {
    fill(view);
    draw = word[0] ?? UINT32_RANGE;
  }
  word.fill(0);
  return draw % range;
}

/** A string of exactly `digits` decimal digits, uniformly distributed and with leading zeros kept. */
export function $randomCode(digits: unknown, fill: FillRandom, prefix: string): Result<string> {
  const ctx = `${prefix} randomCode`;
  if (!$isIntIn<number>(digits, MIN_RANDOM_CODE_DIGITS, MAX_RANDOM_CODE_DIGITS)) {
    return $err({
      message: `${ctx}: Digits must be an integer from ${MIN_RANDOM_CODE_DIGITS} to ${MAX_RANDOM_CODE_DIGITS}`,
      description: "Use 6 digits for one-time codes, and pair them with expiry and attempt limits",
    });
  }
  try {
    return $ok(String($uniformBelow(10 ** digits, fill)).padStart(digits, "0"));
  } catch (error) {
    return $err({ message: `${ctx}: Failed to generate random bytes`, description: $fmtError(error) });
  }
}

/**
 * Formats an RFC 9562 UUIDv7: `random` (16 bytes) with its first 48 bits replaced by `unixMs` big-endian,
 * the version nibble set to 7 and the variant bits set to `10`. Changes `random` in place.
 */
export function $uuidV7(unixMs: number, random: Uint8Array): string {
  let rest = unixMs;
  for (let i = 5; i >= 0; i--) {
    random[i] = rest % 256;
    rest = Math.floor(rest / 256);
  }
  random[6] = ((random[6] ?? 0) & 0x0f) | 0x70;
  random[8] = ((random[8] ?? 0) & 0x3f) | 0x80;
  const hex = $toHex(random);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function $generateUuidV7(fill: FillRandom, ctx: string): Result<string> {
  const now = Date.now();
  if (!$isIntIn(now, 0, UUID_V7_MAX_MS)) {
    return $err({
      message: `${ctx}: Clock is outside the UUIDv7 range`,
      description: "UUIDv7 needs a Unix time from 1970 to the year 10889 in milliseconds",
    });
  }
  const random = new Uint8Array(16);
  fill(random);
  return $ok($uuidV7(now, random));
}

/** Generates a UUID of the requested version: v4 from the platform's `randomUUID`, v7 from {@link $uuidV7}. */
export function $generateUuid(
  options: GenerateUuidOptions,
  prefix: string,
  fill: FillRandom,
  randomUuid: () => string,
): Result<string> {
  const ctx = `${prefix} generateUuid`;
  if (!$isPlainObj<GenerateUuidOptions>(options)) {
    return $err({
      message: `${ctx}: Options must be a plain object`,
      description: "Pass an object like { version: 7 }",
    });
  }
  const version: unknown = options.version ?? 4;
  if (version !== 4 && version !== 7) {
    return $err({ message: `${ctx}: Unsupported UUID version`, description: "Use 4 or 7" });
  }
  try {
    return version === 4 ? $ok(randomUuid()) : $generateUuidV7(fill, ctx);
  } catch (error) {
    return $err({ message: `${ctx}: Failed to generate UUID`, description: $fmtError(error) });
  }
}
