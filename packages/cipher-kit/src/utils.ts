import { $err, $ok, $stringifyError, type Result } from './error';

export const ENCRYPTED_REGEX = /^(?:[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)?\.)$/;
export const ENCRYPTED_NODE_REGEX = /^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.$/;
export const ENCRYPTED_WEB_REGEX = /^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.$/;

export function $isStr(value: unknown, min = 0): value is string {
  return (value !== null || value !== undefined) && typeof value === 'string' && value.trim().length >= min;
}

export function $isObj(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    value !== undefined &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
  );
}

export function $stringifyObj(obj: Record<string, unknown>): Result<string> {
  if (!$isObj(obj)) return $err({ message: 'Invalid object', description: 'Input is not a plain object' });

  try {
    return $ok(JSON.stringify(obj));
  } catch (error) {
    return $err({ message: 'Stringify error', description: $stringifyError(error) });
  }
}

export function $parseToObj(str: string): Result<{ result: Record<string, unknown> }> {
  if (!$isStr(str)) return $err({ message: 'Invalid input', description: 'Input is not a valid string' });

  try {
    const obj = JSON.parse(str);
    if (!$isObj(obj)) {
      return $err({ message: 'Invalid object format', description: 'Parsed data is not a plain object' });
    }

    return $ok({ result: obj });
  } catch (error) {
    return $err({ message: 'Invalid format', description: $stringifyError(error) });
  }
}
