import nodeCrypto from 'node:crypto';
import { $err, $fmtError, $fmtResultErr, $ok, type Result } from '~/error';
import { $isStr, CONFIG } from '~/utils';
import { tryBytesToString, tryStringToBytes } from './node-encode';

/**
 * Hashes the input string using SHA-256 and returns the hash in base64url format.
 *
 * @param data - The input string to hash.
 * @returns A Result containing a string representing the SHA-256 hash in base64url format or an error.
 */
export function tryHash(data: string): Result<string> {
  if (!$isStr(data, 0)) {
    return $err({
      msg: 'Crypto NodeJS API - Hashing: Empty data for hashing',
      desc: 'Data must be a non-empty string',
    });
  }

  try {
    const hashed = nodeCrypto.createHash(CONFIG.hash.sha256.node).update(data).digest();
    return tryBytesToString(hashed, 'base64url');
  } catch (error) {
    return $err({ msg: 'Crypto NodeJS API - Hashing: Failed to hash data with Crypto NodeJS', desc: $fmtError(error) });
  }
}

/**
 * Hashes a password using PBKDF2 with SHA-512.
 *
 * @param password - The password to hash.
 * @returns A Result containing an object with the hash and salt, or an error.
 */
export function tryHashPassword(password: string): Result<{ hash: string; salt: string }> {
  if (!$isStr(password)) {
    return $err({
      msg: 'Crypto NodeJS API - Password Hashing: Empty password for hashing',
      desc: 'Password must be a non-empty string',
    });
  }

  try {
    const salt = nodeCrypto.randomBytes(CONFIG.password.pbkdf2.saltLength).toString('base64url');
    const hash = nodeCrypto
      .pbkdf2Sync(
        password.normalize('NFKC'),
        salt,
        CONFIG.password.pbkdf2.iterations,
        CONFIG.password.pbkdf2.keyLength,
        CONFIG.hash.sha512.node,
      )
      .toString('base64url');
    return $ok({ salt, hash });
  } catch (error) {
    return $err({ msg: 'Crypto NodeJS API - Password Hashing: Failed to hash password', desc: $fmtError(error) });
  }
}

/**
 * Verifies a password against a hashed password and salt.
 *
 * @param password - The password to verify.
 * @param hashedPassword - The hashed password to compare against (in base64url format).
 * @param salt - The salt used during hashing (in base64url format).
 * @returns A boolean indicating whether the password matches the hashed password.
 */
export function verifyPassword(password: string, hashedPassword: string, salt: string): boolean {
  if (!$isStr(password) || !$isStr(hashedPassword) || !$isStr(salt)) return false;
  const { bytes: saltBytes, error: saltError } = tryStringToBytes(salt, 'base64url');
  const { bytes: hashedPasswordBytes, error: hashedPasswordError } = tryStringToBytes(hashedPassword, 'base64url');
  if (saltError || hashedPasswordError) return false;

  try {
    return nodeCrypto.timingSafeEqual(
      nodeCrypto.pbkdf2Sync(
        password.normalize('NFKC'),
        saltBytes,
        CONFIG.password.pbkdf2.iterations,
        CONFIG.password.pbkdf2.keyLength,
        CONFIG.hash.sha512.node,
      ),
      hashedPasswordBytes,
    );
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------

/**
 * Hashes the input string using SHA-256 and returns the hash in base64url format.
 *
 * @param data - The input string to hash.
 * @returns A string representing the SHA-256 hash in base64url format.
 * @throws {Error} If the input data is invalid or hashing fails.
 */
export function hash(data: string): string {
  const { result, error } = tryHash(data);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Hashes a password using PBKDF2 with SHA-512.
 *
 * @param password - The password to hash.
 * @returns An object with the hash and salt.
 * @throws {Error} If the input password is invalid or hashing fails.
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const { hash, salt, error } = tryHashPassword(password);
  if (error) throw new Error($fmtResultErr(error));
  return { hash, salt };
}
