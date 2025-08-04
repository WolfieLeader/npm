import nodeCrypto from 'node:crypto';
import { $err, $ok, $stringifyError, type Result } from '~/error';

export const ENCRYPTED_NODE_REGEX = /^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.$/;

export function newUuid(): Result<string> {
  try {
    return $ok(nodeCrypto.randomUUID());
  } catch (error) {
    return $err({ message: 'Failed to generate UUID with Crypto NodeJS', description: $stringifyError(error) });
  }
}

export function $isNodeKey(key: unknown): key is nodeCrypto.KeyObject {
  return key instanceof nodeCrypto.KeyObject;
}
