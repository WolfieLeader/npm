import type { CIPHER_ENCODING, DIGEST_ALGORITHMS, ENCODING, ENCRYPTION_ALGORITHMS } from "./consts.js";

export type { ErrorStruct } from "@internal/helpers";

export type CipherEncoding = (typeof CIPHER_ENCODING)[number];
export type Encoding = (typeof ENCODING)[number];
export type EncryptionAlgorithm = keyof typeof ENCRYPTION_ALGORITHMS;
export type DigestAlgorithm = keyof typeof DIGEST_ALGORITHMS;

/**
 * Options for creating a secret key (`NodeSecretKey` / `WebSecretKey`) via HKDF derivation.
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
   * Salt for HKDF (default: `'cipher-kit'`, must be ≥ 8 characters).
   *
   * For per-user or per-deployment uniqueness, provide your own unique random salt.
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
  /** Length of the salt in bytes (default: `16`; min: `8`; max: `1024`). */
  saltLength?: number;
  /** Number of iterations for key derivation (default: `320000`; min: `100000`; max: `10000000`). */
  iterations?: number;
  /** Length of the derived key in bytes (default: `64`; min: `16`; max: `1024`). */
  keyLength?: number;
}

/** Options for verifying a password hash (must match the parameters used to hash). */
export interface VerifyPasswordOptions {
  /** Digest algorithm to use (default: `'sha512'`). */
  digest?: DigestAlgorithm;
  /** Encoding format of the input hash (default: `'base64url'`). */
  inputEncoding?: CipherEncoding;
  /** Number of iterations for key derivation (default: `320000`; min: `100000`; max: `10000000`). */
  iterations?: number;
  /** Length of the derived key in bytes (default: `64`; min: `16`; max: `1024`). */
  keyLength?: number;
}

export interface ValidatedKdfOptions {
  algorithm: EncryptionAlgorithm;
  digest: DigestAlgorithm;
  salt: string;
  info: string;
  encryptAlgo: (typeof ENCRYPTION_ALGORITHMS)[EncryptionAlgorithm];
  digestAlgo: (typeof DIGEST_ALGORITHMS)[DigestAlgorithm];
}

export interface ValidatedHashOptions {
  digest: DigestAlgorithm;
  digestAlgo: (typeof DIGEST_ALGORITHMS)[DigestAlgorithm];
  outputEncoding: CipherEncoding;
  saltLength: number;
  iterations: number;
  keyLength: number;
}

export interface ValidatedVerifyOptions {
  digest: DigestAlgorithm;
  digestAlgo: (typeof DIGEST_ALGORITHMS)[DigestAlgorithm];
  inputEncoding: CipherEncoding;
  iterations: number;
  keyLength: number;
}
