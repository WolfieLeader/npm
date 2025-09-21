import type nodeCrypto from 'node:crypto';
import type { webcrypto } from 'node:crypto';

/** Web API Key type */
export type WebApiKey = webcrypto.CryptoKey;

/** Node.js Key type */
export type NodeKey = nodeCrypto.KeyObject;

/** Supported encoding formats */
export type EncodingFormat = 'base64' | 'base64url' | 'hex' | 'utf8';
