import type nodeCrypto from 'node:crypto';
import type { webcrypto } from 'node:crypto';
import type { encodingFormats } from './utils';

/** Web API Key type */
export type WebApiKey = webcrypto.CryptoKey;

/** Node.js Key type */
export type NodeKey = nodeCrypto.KeyObject;

/** Supported encoding formats */
export type EncodingFormat = (typeof encodingFormats)[number];
