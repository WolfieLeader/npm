import type nodeCrypto from "node:crypto";
import type { CIPHER_ENCODING, DIGEST_ALGORITHMS, ENCODING, ENCRYPTION_ALGORITHMS } from "./consts.js";

declare const __brand: unique symbol;

/** A brand type to distinguish between different types */
type Brand<T> = { readonly [__brand]: T };

/** A platform-specific secret key for encryption/decryption. */
export type SecretKey<Platform extends "web" | "node"> = {
  /** Target platform (`'web'` or `'node'`). */
  readonly platform: Platform;
  /** Digest algorithm used for HKDF key derivation. */
  readonly digest: keyof typeof DIGEST_ALGORITHMS;
  /** Symmetric encryption algorithm. */
  readonly algorithm: keyof typeof ENCRYPTION_ALGORITHMS;
  /** Underlying key object — `CryptoKey` on web, `KeyObject` on Node. */
  readonly key: Platform extends "web" ? CryptoKey : nodeCrypto.KeyObject;
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
 * Options for creating a `SecretKey` via HKDF derivation.
 *
 * **Security note:** HKDF is a key expansion function, not a key stretching function.
 * It provides no brute-force resistance. The `secret` parameter must be high-entropy
 * (e.g., a 256-bit random key or a cryptographically strong passphrase).
 * For human-chosen passwords, use {@link HashPasswordOptions | PBKDF2} instead.
 */
export interface CreateSecretKeyOptions {
  /** Encryption algorithm to use (default: `'aes256gcm'`). */
  algorithm?: EncryptionAlgorithm;
  /** Digest algorithm for HKDF (default: `'sha256'`). */
  digest?: DigestAlgorithm;
  /**
   * Salt for HKDF (default: `'cipher-kit-salt'`, must be ≥ 8 characters).
   *
   * **Security note:** The default salt is a fixed string. All keys derived from
   * the same secret with the default salt produce identical output. For per-user
   * or per-deployment uniqueness, provide a unique random salt.
   */
  salt?: string;
  /** Optional context info for HKDF (default: `'cipher-kit'`). */
  info?: string;
  /**
   * Whether the derived Web CryptoKey is extractable (default: `false`).
   * Set to `true` only if you need to export the raw key material via `crypto.subtle.exportKey()`.
   * Has no effect on Node.js keys.
   */
  extractable?: boolean;
}

/** Options for encryption. */
export interface EncryptOptions {
  /** Encoding format for the output ciphertext (default: `'base64url'`). */
  outputEncoding?: CipherEncoding;
}

/** Options for decryption. */
export interface DecryptOptions {
  /** Encoding format for the input ciphertext (default: `'base64url'`). */
  inputEncoding?: CipherEncoding;
}

/** Options for hashing arbitrary data. */
export interface HashOptions {
  /** Digest algorithm to use (default: `'sha256'`). */
  digest?: DigestAlgorithm;
  /** Encoding format for the output hash (default: `'base64url'`). */
  outputEncoding?: CipherEncoding;
}

/** Options for password hashing (PBKDF2). */
export interface HashPasswordOptions {
  /** Digest algorithm to use (default: `'sha512'`). */
  digest?: DigestAlgorithm;
  /** Encoding format for the output hash (default: `'base64url'`). */
  outputEncoding?: CipherEncoding;
  /** Length of the salt in bytes (default: `16` bytes, min: `8` bytes). */
  saltLength?: number;
  /** Number of iterations for key derivation (default: `320000`, min: `100000`). */
  iterations?: number;
  /** Length of the derived key in bytes (default: `64` bytes, min: `16` bytes). */
  keyLength?: number;
}

/** Options for verifying a password hash (must match the parameters used to hash). */
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
