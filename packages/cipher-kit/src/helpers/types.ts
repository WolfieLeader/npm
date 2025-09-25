import type nodeCrypto from 'node:crypto';
import type { webcrypto } from 'node:crypto';
import type { DIGEST_ALGORITHMS, ENCODINGS, ENCRYPTION_ALGORITHMS } from './consts';

declare const __brand: unique symbol;
type Brand<T> = { readonly [__brand]: T };

/** Secret Key Type */
export type SecretKey<Platform extends 'web' | 'node'> = {
  readonly platform: Platform;
  readonly digest: keyof typeof DIGEST_ALGORITHMS;
  readonly algo: (typeof ENCRYPTION_ALGORITHMS)[keyof typeof ENCRYPTION_ALGORITHMS];
  readonly key: Platform extends 'web' ? webcrypto.CryptoKey : nodeCrypto.KeyObject;
} & Brand<`secretKey-${Platform}`>;

/** Supported encoding formats */
export type Encoding = (typeof ENCODINGS)[number];

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
  inputEncoding?: Encoding;
  outputEncoding?: Encoding;
}

export interface DecryptOptions {
  inputEncoding?: Encoding;
  outputEncoding?: Encoding;
}

export interface HashOptions {
  digest?: DigestAlgorithm;
  inputEncoding?: Encoding;
  outputEncoding?: Encoding;
}

export interface HashPasswordOptions {
  digest?: DigestAlgorithm;
  outputEncoding?: Encoding;
  saltLength?: number;
  iterations?: number;
  keyLength?: number;
}

export interface VerifyPasswordOptions {
  digest?: DigestAlgorithm;
  inputEncoding?: Encoding;
  iterations?: number;
  keyLength?: number;
}
