import type nodeCrypto from 'node:crypto';
import type { webcrypto } from 'node:crypto';
import type { ENCODING_FORMATS } from './consts';

declare const __brand: unique symbol;
type Brand<T> = { readonly [__brand]: T };

/** Web API Key type */
export type WebSecretKey = webcrypto.CryptoKey & Brand<'WebSecretKey'>;

/** Node.js Key type */
export type NodeSecretKey = nodeCrypto.KeyObject & Brand<'NodeSecretKey'>;

/** Supported encoding formats */
export type EncodingFormat = (typeof ENCODING_FORMATS)[number];
