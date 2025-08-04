import { $err, $ok, $stringifyError, type Result } from '~/error';
import type { WebApiKey } from '~/types';

export const WEB_API_REGEX = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.$/;

export function newUuid(): Result<string> {
  try {
    return $ok(crypto.randomUUID());
  } catch (error) {
    return $err({ message: 'Failed to generate UUID with Crypto Web API', description: $stringifyError(error) });
  }
}

export function $isWebApiKey(key: unknown): key is WebApiKey {
  return (
    key !== null &&
    key !== undefined &&
    typeof key === 'object' &&
    'type' in key &&
    typeof key.type === 'string' &&
    'algorithm' in key &&
    typeof key.algorithm === 'object' &&
    'extractable' in key &&
    typeof key.extractable === 'boolean' &&
    'usages' in key &&
    Array.isArray(key.usages) &&
    key.usages.every((usage) => typeof usage === 'string')
  );
}
