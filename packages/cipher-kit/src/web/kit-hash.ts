import { $fmtResultErr } from "@internal/helpers";
import type { Result } from "@internal/helpers";
import { $guardAsync } from "~/helpers/guard.js";
import type { HashOptions, HashPasswordOptions, VerifyPasswordOptions } from "~/helpers/types.js";
import { $hash, $hashPassword, $verifyPassword } from "./web-hash.js";

/**
 * Hashes a UTF-8 string (non-throwing).
 *
 * @returns `Promise<Result<string>>` with the hash or error.
 * @see {@link hash} For full parameter/behavior docs.
 */
export async function tryHash(data: string, options: HashOptions = {}): Promise<Result<string>> {
  return $guardAsync("web hash", () => $hash(data, options));
}

/**
 * Hashes a UTF-8 string using the specified digest algorithm.
 *
 * @param data - The input string to hash. Any well-formed string is accepted, including `""`.
 *   Strings with lone UTF-16 surrogates are rejected.
 * @param options - Hash options.
 * @returns The hashed string.
 * @throws {Error} If input is invalid or hashing fails.
 *
 * @example
 * ```ts
 * const hashed = await hash("my data");
 * ```
 *
 * @see {@link tryHash} Non-throwing variant returning `Result<string>`.
 */
export async function hash(data: string, options: HashOptions = {}): Promise<string> {
  const { result, error } = await tryHash(data, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Hashes a password using PBKDF2 (non-throwing).
 *
 * @returns `Promise<Result<{ result: string; salt: string }>>` with the hash/salt or error.
 * @see {@link hashPassword} For full parameter/behavior docs.
 */
export async function tryHashPassword(
  password: string,
  options: HashPasswordOptions = {},
): Promise<Result<{ result: string; salt: string }>> {
  return $guardAsync("web hashPassword", () => $hashPassword(password, options));
}

/**
 * Hashes a password using PBKDF2.
 *
 * @remarks
 * Defaults: `sha512`, 320 000 iterations, 64-byte key, 16-byte random salt.
 *
 * @param password - The password to hash.
 * @param options - Password hashing options.
 * @returns `{ result, salt }` for storage.
 * @throws {Error} If inputs are invalid or hashing fails.
 *
 * @example
 * ```ts
 * const { result, salt } = await hashPassword("my-password");
 * ```
 *
 * @see {@link tryHashPassword} Non-throwing variant returning `Result`.
 */
export async function hashPassword(
  password: string,
  options: HashPasswordOptions = {},
): Promise<{ result: string; salt: string }> {
  const { result, salt, error } = await tryHashPassword(password, options);
  if (error) throw new Error($fmtResultErr(error));
  return { result, salt };
}

/**
 * Verifies a password against a stored PBKDF2 hash (non-throwing).
 *
 * @returns `Promise<Result<boolean>>` — `true` if the password matches, `false` if not, or an error for invalid inputs/options.
 * @see {@link verifyPassword} For full parameter/behavior docs.
 */
export async function tryVerifyPassword(
  password: string,
  hashedPassword: string,
  salt: string,
  options: VerifyPasswordOptions = {},
): Promise<Result<boolean>> {
  return $guardAsync("web verifyPassword", () => $verifyPassword(password, hashedPassword, salt, options));
}

/**
 * Verifies a password against a stored PBKDF2 hash.
 *
 * @remarks
 * Re-derives the key with the same parameters and compares it with the stored hash.
 * Comparison uses the runtime's `crypto.subtle.timingSafeEqual` where one exists (Cloudflare Workers). Elsewhere it is
 * a best-effort constant-time loop; JS JIT optimization may introduce timing variation, since standard Web Crypto has no
 * `timingSafeEqual`. For timing-critical deployments elsewhere, prefer the Node kit, which uses `crypto.timingSafeEqual`.
 * Throws for invalid inputs/options (bad encoding, wrong parameters, non-decodable salt/hash).
 * Returns `false` for password mismatch or length-mismatched hash.
 *
 * @param password - The plain password to verify.
 * @param hashedPassword - The stored hash (encoded).
 * @param salt - The stored salt (encoded).
 * @param options - Verification options (must match the parameters used to hash).
 * @returns `true` if the password matches, otherwise `false`.
 * @throws {Error} If verification input/options are invalid.
 *
 * @example
 * ```ts
 * const { result, salt } = await hashPassword("my-password");
 * await verifyPassword("my-password", result, salt);    // true
 * await verifyPassword("wrong-password", result, salt); // false
 * ```
 *
 * @see {@link tryVerifyPassword} Non-throwing variant returning `Result<boolean>`.
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string,
  salt: string,
  options: VerifyPasswordOptions = {},
): Promise<boolean> {
  const { result, error } = await tryVerifyPassword(password, hashedPassword, salt, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}
