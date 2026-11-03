import nodeCrypto from "node:crypto";
import { $fmtResultErr } from "@internal/helpers";
import type { Result } from "@internal/helpers";
import { $guard } from "~/helpers/guard.js";
import { $generateUuid, $randomCode, $randomToken } from "~/helpers/random.js";
import type { FillRandom } from "~/helpers/random.js";
import type { CipherEncoding, GenerateUuidOptions } from "~/helpers/types.js";

const fillRandom: FillRandom = (bytes) => {
  nodeCrypto.randomFillSync(bytes);
};

/**
 * Generates a UUID (non-throwing).
 *
 * @returns `Result<string>` with the UUID or error.
 * @see {@link generateUuid} For full parameter/behavior docs.
 */
export function tryGenerateUuid(options: GenerateUuidOptions = {}): Result<string> {
  return $guard("node generateUuid", () => $generateUuid(options, "node", fillRandom, () => nodeCrypto.randomUUID()));
}

/**
 * Generates a UUID: v4 (random) by default, or v7 (RFC 9562) with `{ version: 7 }`.
 *
 * @remarks
 * A v7 UUID starts with the 48-bit Unix time in milliseconds, then 74 random bits. UUIDs from different
 * milliseconds sort by creation time as strings; UUIDs from the same millisecond are not guaranteed to sort in
 * creation order. A v7 UUID reveals when it was made.
 *
 * @param options - UUID options.
 * @returns A lowercase UUID string.
 * @throws {Error} If the options are invalid or UUID generation fails.
 *
 * @example
 * ```ts
 * const id = generateUuid(); // v4
 * const sortable = generateUuid({ version: 7 });
 * ```
 *
 * @see {@link tryGenerateUuid} Non-throwing variant returning `Result<string>`.
 */
export function generateUuid(options: GenerateUuidOptions = {}): string {
  const { result, error } = tryGenerateUuid(options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Generates a random token (non-throwing).
 *
 * @returns `Result<string>` with the token or error.
 * @see {@link randomToken} For full parameter/behavior docs.
 */
export function tryRandomToken(bytes: number = 32, encoding: CipherEncoding = "base64url"): Result<string> {
  return $guard("node randomToken", () => $randomToken(bytes, encoding, fillRandom, "node"));
}

/**
 * Generates `bytes` cryptographically secure random bytes, encoded as a string.
 *
 * @param bytes - Number of random bytes (default: `32`; integer from `8` to `1024`).
 * @param encoding - Output encoding (default: `'base64url'`).
 * @returns The encoded token.
 * @throws {Error} If the arguments are invalid or random generation fails.
 *
 * @example
 * ```ts
 * const token = randomToken(); // 43 base64url characters (256 bits)
 * const hex = randomToken(16, "hex"); // 32 hex characters
 * ```
 *
 * @see {@link tryRandomToken} Non-throwing variant returning `Result<string>`.
 */
export function randomToken(bytes: number = 32, encoding: CipherEncoding = "base64url"): string {
  const { result, error } = tryRandomToken(bytes, encoding);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Generates a random numeric code (non-throwing).
 *
 * @returns `Result<string>` with the code or error.
 * @see {@link randomCode} For full parameter/behavior docs.
 */
export function tryRandomCode(digits: number = 6): Result<string> {
  return $guard("node randomCode", () => $randomCode(digits, fillRandom, "node"));
}

/**
 * Generates a uniformly random numeric code, such as a one-time passcode.
 *
 * @remarks
 * Uses rejection sampling over random 32-bit values, so every code is equally likely.
 * Leading zeros are kept: the result always has exactly `digits` characters.
 *
 * @param digits - Number of digits (default: `6`; integer from `4` to `9`).
 * @returns A string of exactly `digits` decimal digits.
 * @throws {Error} If `digits` is invalid or random generation fails.
 *
 * @example
 * ```ts
 * const code = randomCode(); // e.g. "042917"
 * ```
 *
 * @see {@link tryRandomCode} Non-throwing variant returning `Result<string>`.
 */
export function randomCode(digits: number = 6): string {
  const { result, error } = tryRandomCode(digits);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}
