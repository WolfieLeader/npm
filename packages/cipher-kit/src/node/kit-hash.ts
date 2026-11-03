import { $fmtResultErr } from "@internal/helpers";
import type { Result } from "@internal/helpers";
import { $guard } from "~/helpers/guard.js";
import type { HashOptions, HashPasswordOptions, VerifyPasswordOptions } from "~/helpers/types.js";
import { $hash, $hashPassword, $verifyPassword } from "./node-hash.js";

/**
 * Hashes a UTF-8 string (non-throwing).
 *
 * @returns `Result<string>` with the hash or error.
 * @see {@link hash} For full parameter/behavior docs.
 */
export function tryHash(data: string, options: HashOptions = {}): Result<string> {
  return $guard("node hash", () => $hash(data, options));
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
 * const hashed = hash("my data");
 * ```
 *
 * @see {@link tryHash} Non-throwing variant returning `Result<string>`.
 */
export function hash(data: string, options: HashOptions = {}): string {
  const { result, error } = tryHash(data, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Hashes a password using PBKDF2 (non-throwing).
 *
 * @returns `Result<{ result: string; salt: string }>` with the hash/salt or error.
 * @see {@link hashPassword} For full parameter/behavior docs.
 */
export function tryHashPassword(
  password: string,
  options: HashPasswordOptions = {},
): Result<{ result: string; salt: string }> {
  return $guard("node hashPassword", () => $hashPassword(password, options));
}

/**
 * Hashes a password using PBKDF2.
 *
 * @remarks
 * Defaults: `sha512`, 320 000 iterations, 64-byte key, 16-byte random salt.
 *
 * **Performance note:** Uses synchronous `pbkdf2Sync` which blocks the event loop
 * (~100-300 ms at default iterations). For server-side use under load, prefer the
 * Web Crypto API (async) via `webKit.hashPassword` instead.
 *
 * @param password - The password to hash.
 * @param options - Password hashing options.
 * @returns `{ result, salt }` for storage.
 * @throws {Error} If inputs are invalid or hashing fails.
 *
 * @example
 * ```ts
 * const { result, salt } = hashPassword("my-password");
 * ```
 *
 * @see {@link tryHashPassword} Non-throwing variant returning `Result`.
 */
export function hashPassword(password: string, options: HashPasswordOptions = {}): { result: string; salt: string } {
  const { result, salt, error } = tryHashPassword(password, options);
  if (error) throw new Error($fmtResultErr(error));
  return { result, salt };
}

/**
 * Verifies a password against a stored PBKDF2 hash (non-throwing).
 *
 * @returns `Result<boolean>` — `true` if the password matches, `false` if not, or an error for invalid inputs/options.
 * @see {@link verifyPassword} For full parameter/behavior docs.
 */
export function tryVerifyPassword(
  password: string,
  hashedPassword: string,
  salt: string,
  options: VerifyPasswordOptions = {},
): Result<boolean> {
  return $guard("node verifyPassword", () => $verifyPassword(password, hashedPassword, salt, options));
}

/**
 * Verifies a password against a stored PBKDF2 hash.
 *
 * @remarks
 * Re-derives the key with the same parameters and compares in constant time to prevent timing attacks.
 * Throws for invalid inputs/options (bad encoding, wrong parameters, non-decodable salt/hash).
 * Returns `false` for password mismatch or length-mismatched hash.
 *
 * **Performance note:** Uses synchronous `pbkdf2Sync` which blocks the event loop
 * (~100-300 ms at default iterations). For server-side use under load, prefer the
 * Web Crypto API (async) via `webKit.verifyPassword` instead.
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
 * const { result, salt } = hashPassword("my-password");
 * verifyPassword("my-password", result, salt);    // true
 * verifyPassword("wrong-password", result, salt); // false
 * ```
 *
 * @see {@link tryVerifyPassword} Non-throwing variant returning `Result<boolean>`.
 */
export function verifyPassword(
  password: string,
  hashedPassword: string,
  salt: string,
  options: VerifyPasswordOptions = {},
): boolean {
  const { result, error } = tryVerifyPassword(password, hashedPassword, salt, options);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}
