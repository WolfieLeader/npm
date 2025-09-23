import { $err, $fmtError, $fmtResultErr, $ok, type Result } from './error';
import { $isObj, $isStr } from './validate';

export function $stringifyObj<T extends object = Record<string, unknown>>(obj: T): Result<string> {
  try {
    if (!$isObj(obj)) return $err({ msg: 'Invalid object', desc: 'Input is not a plain object' });
    return $ok(JSON.stringify(obj));
  } catch (error) {
    return $err({ msg: 'Utility: Stringify error', desc: $fmtError(error) });
  }
}

/**
 * Stringify an object.
 *
 * @param obj - The object to stringify.
 * @returns An JSON string.
 * @throws {Error} If the object cannot be stringified.
 */
export function stringifyObj<T extends object = Record<string, unknown>>(obj: T): string {
  const { result, error } = $stringifyObj(obj);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Stringify an object.
 *
 * @param obj - The object to stringify.
 * @returns A Result containing the JSON string or an error.
 */
export function tryStringifyObj<T extends object = Record<string, unknown>>(obj: T): Result<string> {
  return $stringifyObj(obj);
}

export function $parseToObj<T extends object = Record<string, unknown>>(str: string): Result<{ result: T }> {
  try {
    if (!$isStr(str)) return $err({ msg: 'Utility: Invalid input', desc: 'Input is not a valid string' });
    const obj = JSON.parse(str);

    if (!$isObj(obj)) return $err({ msg: 'Utility: Invalid object format', desc: 'Parsed data is not a plain object' });
    return $ok({ result: obj as T });
  } catch (error) {
    return $err({ msg: 'Utility: Invalid format', desc: $fmtError(error) });
  }
}

/**
 * Parse a string to an object.
 *
 * @param str - The JSON string to parse.
 * @returns A Result containing the parsed object or an error.
 */
export function tryParseToObj<T extends object = Record<string, unknown>>(str: string): Result<{ result: T }> {
  return $parseToObj<T>(str);
}

/**
 * Parse a string to an object.
 *
 * @param str - The JSON string to parse.
 * @returns A parsed object.
 * @throws {Error} If the string cannot be parsed or is not a valid object.
 */
export function parseToObj<T extends object = Record<string, unknown>>(str: string): T {
  const { result, error } = $parseToObj<T>(str);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}
