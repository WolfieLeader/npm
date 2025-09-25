import type nodeCrypto from 'node:crypto';
import type { webcrypto } from 'node:crypto';
import type { DIGEST_ALGORITHMS, ENCODING_FORMATS, ENCRYPTION_ALGORITHMS } from './consts';

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
export type EncodingFormat = (typeof ENCODING_FORMATS)[number];
