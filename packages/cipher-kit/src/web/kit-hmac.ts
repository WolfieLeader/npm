import { $fmtResultErr } from "@internal/helpers";
import type { Result } from "@internal/helpers";
import { $guardAsync } from "~/helpers/guard.js";
import type { HmacOptions, VerifyHmacOptions } from "~/helpers/types.js";
import { $hmac, $verifyHmac } from "./web-hmac.js";

/**
 * Computes an HMAC (non-throwing).
 *
 * @returns `Promise<Result<string>>` with the encoded MAC or error.
 * @see {@link hmac} For full parameter/behavior docs.
 */
export async function tryHmac(
  data: string | Uint8Array,
  key: string | Uint8Array,
  options: HmacOptions = {},
): Promise<Result<string>> {
  return $guardAsync("web hmac", () => $hmac(data, key, options));
}

/**
 * Computes an HMAC (RFC 2104) of `data` with `key`.
 *
 * @remarks
 * The key is used as given: a string key becomes its UTF-8 bytes, with no normalization or key derivation.
 * So the MAC matches any other HMAC implementation given the same key bytes, such as webhook signatures
 * (`await hmac(rawBody, signingSecret, { outputEncoding: "hex" })`). Use a high-entropy key; HMAC adds no
 * brute-force resistance. To check a MAC, use {@link verifyHmac}. Node and Web return identical MACs.
 *
 * @param data - The message: a well-formed string (hashed as UTF-8) or bytes. `""` is accepted.
 * @param key - The secret key: a non-empty, well-formed string (used as UTF-8 bytes) or non-empty bytes.
 * @param options - HMAC options. `length` truncates the MAC to its first `length` bytes (min 8).
 * @returns The encoded MAC.
 * @throws {Error} If the input or options are invalid, or the HMAC fails.
 *
 * @example
 * ```ts
 * const mac = await hmac("message", "my-signing-key"); // HMAC-SHA-256, base64url
 * const hex = await hmac("message", "my-signing-key", { digest: "sha512", outputEncoding: "hex" });
 * ```
 *
 * @see {@link tryHmac} Non-throwing variant returning `Result<string>`.
 */
export async function hmac(
  data: string | Uint8Array,
  key: string | Uint8Array,
  options: HmacOptions = {},
): Promise<string> {
  const { result, error } = await tryHmac(data, key, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Verifies an HMAC (non-throwing).
 *
 * @returns `Promise<Result<boolean>>` — `true` if the MAC matches, `false` if not, or an error for invalid input/options.
 * @see {@link verifyHmac} For full parameter/behavior docs.
 */
export async function tryVerifyHmac(
  data: string | Uint8Array,
  mac: string,
  key: string | Uint8Array,
  options: VerifyHmacOptions = {},
): Promise<Result<boolean>> {
  return $guardAsync("web verifyHmac", () => $verifyHmac({ data, mac, key }, options));
}

/**
 * Verifies an HMAC of `data` with `key`.
 *
 * @remarks
 * The expected MAC length is `options.length` (default: the full digest length), never the presented MAC's length.
 * A presented MAC that does not decode, or decodes to any other length, returns `false`.
 * Comparison is a best-effort constant-time loop over every byte, since Web Crypto exposes no `timingSafeEqual`.
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
 * const mac = await hmac("message", "my-signing-key");
 * await verifyHmac("message", mac, "my-signing-key"); // true
 * await verifyHmac("tampered", mac, "my-signing-key"); // false
 * ```
 *
 * @see {@link tryVerifyHmac} Non-throwing variant returning `Result<boolean>`.
 */
export async function verifyHmac(
  data: string | Uint8Array,
  mac: string,
  key: string | Uint8Array,
  options: VerifyHmacOptions = {},
): Promise<boolean> {
  const { result, error } = await tryVerifyHmac(data, mac, key, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}
