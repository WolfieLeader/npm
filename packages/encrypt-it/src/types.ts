import type nodeCrypto from 'node:crypto';
import type { webcrypto } from 'node:crypto';

export type WebApiKey = webcrypto.CryptoKey;
export type NodeKey = nodeCrypto.KeyObject;
