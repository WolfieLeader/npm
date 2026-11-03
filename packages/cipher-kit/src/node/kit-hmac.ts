import { $fmtResultErr } from "@internal/helpers";
import type { Result } from "@internal/helpers";
import { $guard } from "~/helpers/guard.js";
import type { HmacOptions, VerifyHmacOptions } from "~/helpers/types.js";
import { $hmac, $verifyHmac } from "./node-hmac.js";

/**
 * Computes an HMAC (non-throwing).
 *
 * @returns `Result<string>` with the encoded MAC or error.
 * @see {@link hmac} For full parameter/behavior docs.
 */
export function tryHmac(
  data: string | Uint8Array,
  key: string | Uint8Array,
  options: HmacOptions = {},
): Result<string> {
  return $guard("node hmac", () => $hmac(data, key, options));
}

/**
 * Computes an HMAC (RFC 2104) of `data` with `key`.
 *
 * @remarks
 * The key is used as given: a string key becomes its UTF-8 bytes, with no normalization or key derivation.
 * So the MAC matches any other HMAC implementation given the same key bytes, such as webhook signatures
 * (`hmac(rawBody, signingSecret, { outputEncoding: "hex" })`). Use a high-entropy key; HMAC adds no brute-force
 * resistance. To check a MAC, use {@link verifyHmac}, which compares in constant time.
 *
 * @param data - The message: a well-formed string (hashed as UTF-8) or bytes. `""` is accepted.
 * @param key - The secret key: a non-empty, well-formed string (used as UTF-8 bytes) or non-empty bytes.
 * @param options - HMAC options. `length` truncates the MAC to its first `length` bytes (min 8).
 * @returns The encoded MAC.
 * @throws {Error} If the input or options are invalid, or the HMAC fails.
 *
 * @example
 * ```ts
 * const mac = hmac("message", "my-signing-key"); // HMAC-SHA-256, base64url
 * const hex = hmac("message", "my-signing-key", { digest: "sha512", outputEncoding: "hex" });
 * ```
 *
 * @see {@link tryHmac} Non-throwing variant returning `Result<string>`.
 */
export function hmac(data: string | Uint8Array, key: string | Uint8Array, options: HmacOptions = {}): string {
  const { result, error } = tryHmac(data, key, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Verifies an HMAC (non-throwing).
 *
 * @returns `Result<boolean>` — `true` if the MAC matches, `false` if not, or an error for invalid input/options.
 * @see {@link verifyHmac} For full parameter/behavior docs.
 */
export function tryVerifyHmac(
  data: string | Uint8Array,
  mac: string,
  key: string | Uint8Array,
  options: VerifyHmacOptions = {},
): Result<boolean> {
  return $guard("node verifyHmac", () => $verifyHmac({ data, mac, key }, options));
}

/**
 * Verifies an HMAC of `data` with `key` in constant time.
 *
 * @remarks
 * The expected MAC length is `options.length` (default: the full digest length), never the presented MAC's length.
 * A presented MAC that does not decode, or decodes to any other length, returns `false`.
 * Comparison uses `crypto.timingSafeEqual`.
 *
 * @param data - The message: a well-formed string (hashed as UTF-8) or bytes.
 * @param mac - The presented MAC, encoded with `options.inputEncoding`.
 * @param key - The secret key, exactly as passed to {@link hmac}.
 * @param options - Verification options (must match the options used to compute the MAC).
 * @returns `true` if the MAC matches, otherwise `false`.
 * @throws {Error} If the input or options are invalid.
 *
 * @example
 * ```ts
 * const mac = hmac("message", "my-signing-key");
 * verifyHmac("message", mac, "my-signing-key"); // true
 * verifyHmac("tampered", mac, "my-signing-key"); // false
 * ```
 *
 * @see {@link tryVerifyHmac} Non-throwing variant returning `Result<boolean>`.
 */
export function verifyHmac(
  data: string | Uint8Array,
  mac: string,
  key: string | Uint8Array,
  options: VerifyHmacOptions = {},
): boolean {
  const { result, error } = tryVerifyHmac(data, mac, key, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}
