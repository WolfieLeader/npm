import { $err, $fmtError, $fmtResultErr, $ok, type Result } from '~/error';
import { $isStr, CONFIG } from '~/utils';
import { bytesToString, tryBytesToString, tryStringToBytes } from './web-encode';

const textEncoder = new TextEncoder();

/**
 * Hashes the input string using SHA-256 and returns the hash in base64url format.
 *
 * @param data - The input string to hash.
 * @returns A Result containing a string representing the SHA-256 hash in base64url format or an error.
 */
export async function tryHash(data: string): Promise<Result<string>> {
  if (!$isStr(data, 0)) {
    return $err({ msg: 'Crypto Web API - Hashing: Empty data for hashing', desc: 'Data must be a non-empty string' });
  }

  const { bytes, error } = tryStringToBytes(data, 'utf8');
  if (error) return $err(error);

  try {
    const hashed = await crypto.subtle.digest(CONFIG.hash.sha256.web, bytes);
    return tryBytesToString(hashed, 'base64url');
  } catch (error) {
    return $err({ msg: 'Crypto Web API - Hashing: Failed to hash data', desc: $fmtError(error) });
  }
}

export async function tryHashPassword(password: string): Promise<Result<{ hash: string; salt: string }>> {
  if (!$isStr(password)) {
    return $err({
      msg: 'Crypto Web API - Password Hashing: Empty password',
      desc: 'Password must be a non-empty string',
    });
  }

  try {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const baseKey = await crypto.subtle.importKey(
      'raw',
      textEncoder.encode(password.normalize('NFKC')),
      'PBKDF2',
      false,
      ['deriveBits'],
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: CONFIG.password.pbkdf2.iterations, hash: CONFIG.hash.sha512.web },
      baseKey,
      CONFIG.password.pbkdf2.keyLength * 8,
    );
    const { result: saltString, error: saltError } = tryBytesToString(salt, 'base64url');
    if (saltError) return $err(saltError);
    const { result: hashString, error: hashError } = tryBytesToString(bits, 'base64url');
    if (hashError) return $err(hashError);
    return $ok({ hash: hashString, salt: saltString });
  } catch (error) {
    return $err({ msg: 'Crypto Web API - Password Hashing: Failed to hash password', desc: $fmtError(error) });
  }
}

export async function verifyPassword(password: string, hashedPassword: string, salt: string): Promise<boolean> {
  if (!$isStr(password) || !$isStr(hashedPassword) || !$isStr(salt)) return false;
  const { bytes: saltBytes, error: saltError } = tryStringToBytes(salt, 'base64url');
  if (saltError) return false;

  try {
    const baseKey = await crypto.subtle.importKey(
      'raw',
      textEncoder.encode(password.normalize('NFKC')),
      'PBKDF2',
      false,
      ['deriveBits'],
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: saltBytes, iterations: CONFIG.password.pbkdf2.iterations, hash: CONFIG.hash.sha512.web },
      baseKey,
      CONFIG.password.pbkdf2.keyLength * 8,
    );
    return bytesToString(bits, 'base64url') === hashedPassword;
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
export async function hash(data: string): Promise<string> {
  const { result, error } = await tryHash(data);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}
