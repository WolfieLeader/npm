import type nodeCrypto from 'node:crypto';
import type { webcrypto } from 'node:crypto';
import type { CIPHER_ENCODING, DIGEST_ALGORITHMS, ENCODING, ENCRYPTION_ALGORITHMS } from './consts';

declare const __brand: unique symbol;
type Brand<T> = { readonly [__brand]: T };

/**
 * A secret key for encryption/decryption.
 *
 * @template Platform - 'web' or 'node' to specify the platform of the secret key.
 */
export type SecretKey<Platform extends 'web' | 'node'> = {
  readonly platform: Platform;
  readonly digest: keyof typeof DIGEST_ALGORITHMS;
  readonly algorithm: keyof typeof ENCRYPTION_ALGORITHMS;
  readonly key: Platform extends 'web' ? webcrypto.CryptoKey : nodeCrypto.KeyObject;
} & Brand<`secretKey-${Platform}`>;

/** Supported cipher encoding formats */
export type CipherEncoding = (typeof CIPHER_ENCODING)[number];

/** Supported encoding formats */
export type Encoding = (typeof ENCODING)[number];

/** Supported encryption algorithms */
export type EncryptionAlgorithm = keyof typeof ENCRYPTION_ALGORITHMS;

/** Supported digest algorithms */
export type DigestAlgorithm = keyof typeof DIGEST_ALGORITHMS;

/** Options for creating a secret key */
export interface CreateSecretKeyOptions {
  algorithm?: EncryptionAlgorithm;
  digest?: DigestAlgorithm;
  salt?: string;
  info?: string;
}

/** Options for encryption */
export interface EncryptOptions {
  /** Encoding format for the output ciphertext */
  encoding?: CipherEncoding;
}

/** Options for decryption */
export interface DecryptOptions {
  /** Encoding format of the input ciphertext */
  encoding?: CipherEncoding;
}

/** Options for hashing */
export interface HashOptions {
  /** Digest algorithm to use */
  digest?: DigestAlgorithm;
  /** Encoding format for the output hash */
  encoding?: CipherEncoding;
}

/** Options for password hashing and verification */
export interface HashPasswordOptions {
  /** Digest algorithm to use */
  digest?: DigestAlgorithm;
  /** Encoding format for the output hash */
  encoding?: CipherEncoding;
  /** Length of the salt in bytes */
  saltLength?: number;
  /** Number of iterations for key derivation */
  iterations?: number;
  /** Length of the derived key in bytes */
  keyLength?: number;
}

/** Options for verifying a password hash */
export interface VerifyPasswordOptions {
  /** Digest algorithm to use */
  digest?: DigestAlgorithm;
  /** Encoding format of the input hash */
  encoding?: CipherEncoding;
  /** Number of iterations for key derivation */
  iterations?: number;
  /** Length of the derived key in bytes */
  keyLength?: number;
}
