import { $err, $ok, $stringifyError, type Result } from './error';

export const COMPRESSION_REGEX = Object.freeze({
  GENERAL: /^[A-Za-z0-9\-_]+\.(0|1)\.$/,
  UNCOMPRESSED: /^[A-Za-z0-9\-_]+\.0\.$/,
  COMPRESSED: /^[A-Za-z0-9\-_]+\.1\.$/,
});

export function isInCompressionFormat(data: string): boolean {
  return typeof data === 'string' && COMPRESSION_REGEX.GENERAL.test(data);
}

export function isInCompressedFormat(data: string): boolean {
  return typeof data === 'string' && COMPRESSION_REGEX.COMPRESSED.test(data);
}

export function isInUncompressedFormat(data: string): boolean {
  return typeof data === 'string' && COMPRESSION_REGEX.UNCOMPRESSED.test(data);
}

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

export function stringifyObj(obj: Record<string, unknown>): Result<string> {
  try {
    if (!$isObj(obj)) return $err({ msg: 'Invalid object', desc: 'Input is not a plain object' });
    return $ok(JSON.stringify(obj));
  } catch (error) {
    return $err({ msg: 'Stringify error', desc: $stringifyError(error) });
  }
}

export function parseToObj(str: string): Result<{ result: Record<string, unknown> }> {
  try {
    if (!$isStr(str)) return $err({ msg: 'Invalid input', desc: 'Input is not a valid string' });
    const obj = JSON.parse(str);
    if (!$isObj(obj)) return $err({ msg: 'Invalid object format', desc: 'Parsed data is not a plain object' });
    return $ok({ result: obj });
  } catch (error) {
    return $err({ msg: 'Invalid format', desc: $stringifyError(error) });
  }
}
