import type nodeCrypto from 'node:crypto';
import type { webcrypto } from 'node:crypto';
import type { CIPHER_ENCODING, DIGEST_ALGORITHMS, ENCODING, ENCRYPTION_ALGORITHMS } from './consts';

declare const __brand: unique symbol;
type Brand<T> = { readonly [__brand]: T };

/** Secret Key Type */
export type SecretKey<Platform extends 'web' | 'node'> = {
  readonly platform: Platform;
  readonly digest: keyof typeof DIGEST_ALGORITHMS;
  readonly algorithm: keyof typeof ENCRYPTION_ALGORITHMS;
  readonly key: Platform extends 'web' ? webcrypto.CryptoKey : nodeCrypto.KeyObject;
} & Brand<`secretKey-${Platform}`>;

export type CipherEncoding = (typeof CIPHER_ENCODING)[number];

/** Supported encoding formats */
export type Encoding = (typeof ENCODING)[number];

/** Supported encryption algorithms */
export type EncryptionAlgorithm = keyof typeof ENCRYPTION_ALGORITHMS;

/** Supported digest algorithms */
export type DigestAlgorithm = keyof typeof DIGEST_ALGORITHMS;

export interface CreateSecretKeyOptions {
  algorithm?: EncryptionAlgorithm;
  digest?: DigestAlgorithm;
  salt?: string;
  info?: string;
}

export interface EncryptOptions {
  encoding?: CipherEncoding;
}

export interface DecryptOptions {
  encoding?: CipherEncoding;
}

export interface HashOptions {
  digest?: DigestAlgorithm;
  encoding?: CipherEncoding;
}

export interface HashPasswordOptions {
  digest?: DigestAlgorithm;
  encoding?: CipherEncoding;
  saltLength?: number;
  iterations?: number;
  keyLength?: number;
}

export interface VerifyPasswordOptions {
  digest?: DigestAlgorithm;
  encoding?: CipherEncoding;
  iterations?: number;
  keyLength?: number;
}
