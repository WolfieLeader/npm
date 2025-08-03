import type { Result } from '~/error';
import type { NodeKey, WebApiKey } from '~/types';
import * as node from './node';
import * as webApi from './web-api';

export const ENCODE_FORMAT = 'base64url';
export const NODE_ALGORITHM = 'aes-256-gcm';
export const WEB_API_ALGORITHM = 'AES-GCM';

export function newNodeUuid(): Result<string> {
  return node.newUuid();
}

export function newWebApiUuid(): Result<string> {
  return webApi.newUuid();
}

export function nodeHash(data: string): Result<string> {
  return node.hash(data);
}

export async function webApiHash(data: string): Promise<Result<string>> {
  return webApi.hash(data);
}

export function newNodeSecretKey(key: string | NodeKey): Result<{ secretKey: NodeKey }> {
  return node.newSecretKey(key);
}

export async function newWebApiSecretKey(key: string | WebApiKey): Promise<Result<{ secretKey: WebApiKey }>> {
  return webApi.newSecretKey(key);
}

export function nodeEncrypt(data: string, secretKey: NodeKey): Result<string> {
  return node.encrypt(data, secretKey);
}

export async function webApiEncrypt(data: string, secretKey: WebApiKey): Promise<Result<string>> {
  return webApi.encrypt(data, secretKey);
}

export function nodeDecrypt(encrypted: string, secretKey: NodeKey): Result<string> {
  return node.decrypt(encrypted, secretKey);
}

export async function webApiDecrypt(encrypted: string, secretKey: WebApiKey): Promise<Result<string>> {
  return webApi.decrypt(encrypted, secretKey);
}
