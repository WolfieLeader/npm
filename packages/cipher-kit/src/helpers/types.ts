import type nodeCrypto from "node:crypto";
import type { webcrypto } from "node:crypto";
import type { CIPHER_ENCODING, DIGEST_ALGORITHMS, ENCODING, ENCRYPTION_ALGORITHMS } from "./consts";

declare const __brand: unique symbol;

/** A brand type to distinguish between different types */
type Brand<T> = { readonly [__brand]: T };

/**
 * A platform-specific secret key for encryption/decryption.
 *
 * ### 🍼 Explain Like I'm Five
 * You have a treasure (your secret data) and want to keep it safe.
 * For that you create a key (the secret key) and lock your treasure with it.
 *
 * @template Platform - 'web' or 'node' to specify the platform of the secret key.
 */
export type SecretKey<Platform extends "web" | "node"> = {
  /** The platform the key is for ('web' or 'node'). */
  readonly platform: Platform;
  /** The digest algorithm used for HKDF (e.g. 'sha256'). */
  readonly digest: keyof typeof DIGEST_ALGORITHMS;
  /** The encryption algorithm used (e.g. 'aes256gcm'). */
  readonly algorithm: keyof typeof ENCRYPTION_ALGORITHMS;
  /** The actual secret key object (CryptoKey for web, KeyObject for node). */
  readonly key: Platform extends "web" ? webcrypto.CryptoKey : nodeCrypto.KeyObject;
} & Brand<`secretKey-${Platform}`>;

/** Supported **cipher text** encodings for encrypted/hash outputs. */
export type CipherEncoding = (typeof CIPHER_ENCODING)[number];

/** Supported data encodings for **plain text/bytes** conversions. */
export type Encoding = (typeof ENCODING)[number];

/** Supported symmetric encryption algorithms */
export type EncryptionAlgorithm = keyof typeof ENCRYPTION_ALGORITHMS;

/** Supported digest algorithms for hashing */
export type DigestAlgorithm = keyof typeof DIGEST_ALGORITHMS;

/**
 * Options for creating a `SecretKey`
 *
 * ### 🍼 Explain Like I'm Five
 * You want to create a special key to lock your treasure box.
 * You can choose how strong the lock is (algorithm), how to make the key (digest),
 * and add some extra secret stuff (salt and info) to make your key unique.
 *
 * - `algorithm` (default: `'aes256gcm'`)
 * - `digest` (HKDF hash; default: `'sha256'`)
 * - `salt` (default: `'cipher-kit-salt'`, must be ≥ 8 chars)
 * - `info` (default: `'cipher-kit'`)
 */
export interface CreateSecretKeyOptions {
  /** Encryption algorithm to use (default: `'aes256gcm'`). */
  algorithm?: EncryptionAlgorithm;
  /** Digest algorithm for HKDF (default: `'sha256'`). */
  digest?: DigestAlgorithm;
  /** Optional salt for HKDF (default: `'cipher-kit-salt'`, must be ≥ 8 characters). */
  salt?: string;
  /** Optional context info for HKDF (default: `'cipher-kit'`). */
  info?: string;
}

/**
 * Options for encryption.
 *
 * ### 🍼 Explain Like I'm Five
 * After locking your message, how should we write the locked message down?
 *
 * - `outputEncoding`: output ciphertext encoding (`'base64' | 'base64url' | 'hex'`) (default: `'base64url'`)
 */
export interface EncryptOptions {
  /** Encoding format for the output ciphertext (default: `'base64url'`). */
  outputEncoding?: CipherEncoding;
}

/**
 * Options for decryption.
 *
 * ### 🍼 Explain Like I'm Five
 * To unlock the message, we must know how it was written down.
 *
 * - `inputEncoding`: input ciphertext encoding (`'base64' | 'base64url' | 'hex'`) (default: `'base64url'`)
 */
export interface DecryptOptions {
  /** Encoding format for the input ciphertext (default: `'base64url'`). */
  inputEncoding?: CipherEncoding;
}

/**
 * Options for hashing arbitrary data.
 *
 * ### 🍼 Explain Like I'm Five
 * You want to create a unique fingerprint (hash) of your data.
 * You can choose how to create the fingerprint (digest) and how to write it down (encoding).
 *
 * - `digest`: `'sha256' | 'sha384' | 'sha512'` (default: `'sha256'`)
 * - `outputEncoding`: output ciphertext encoding for the hash (`'base64' | 'base64url' | 'hex'`; default: `'base64url'`)
 */
export interface HashOptions {
  /** Digest algorithm to use (default: `'sha256'`). */
  digest?: DigestAlgorithm;
  /** Encoding format for the output hash (default: `'base64url'`). */
  outputEncoding?: CipherEncoding;
}

/**
 * Options for password hashing (PBKDF2).
 *
 * ### 🍼 Explain Like I'm Five
 * We turn your password into a strong secret by mixing it with salt,
 * stirring many times (iterations), and making a long result (keyLength).
 *
 * - `digest`: `'sha256' | 'sha384' | 'sha512'` (default: `'sha512'`)
 * - `outputEncoding`: output ciphertext encoding for the hash (`'base64' | 'base64url' | 'hex'`; default: `'base64url'`)
 * - `saltLength`: size of the random salt in bytes (default: `16` bytes)
 * - `iterations`: number of iterations (default: `320000`)
 * - `keyLength`: length of the derived key in bytes (default: `64` bytes)
 */
export interface HashPasswordOptions {
  /** Digest algorithm to use (default: `'sha512'`). */
  digest?: DigestAlgorithm;
  /** Encoding format for the output hash (default: `'base64url'`). */
  outputEncoding?: CipherEncoding;
  /** Length of the salt in bytes (default: `16` bytes, min: `8` bytes). */
  saltLength?: number;
  /** Number of iterations for key derivation (default: `320000`, min: `1000`). */
  iterations?: number;
  /** Length of the derived key in bytes (default: `64` bytes, min: `16` bytes). */
  keyLength?: number;
}

/**
 * Options for verifying a password hash (PBKDF2) (must match the parameters used to hash).
 *
 * ### 🍼 Explain Like I'm Five
 * To check a password, we must use the same recipe—same mixer, same number of stirs,
 * same size—so the new result matches the old one.
 *
 * - `digest`: `'sha256' | 'sha384' | 'sha512'` (default: `'sha512'`)
 * - `inputEncoding`: input ciphertext encoding for the hash (`'base64' | 'base64url' | 'hex'`; default: `'base64url'`)
 * - `iterations`: number of iterations (default: `320000`)
 * - `keyLength`: length of the derived key in bytes (default: `64` bytes)
 */
export interface VerifyPasswordOptions {
  /** Digest algorithm to use (default: `'sha512'`). */
  digest?: DigestAlgorithm;
  /** Encoding format of the input hash (default: `'base64url'`). */
  inputEncoding?: CipherEncoding;
  /** Number of iterations for key derivation (default: `320000`). */
  iterations?: number;
  /** Length of the derived key in bytes (default: `64` bytes). */
  keyLength?: number;
}
