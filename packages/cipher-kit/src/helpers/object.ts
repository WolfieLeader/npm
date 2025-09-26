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
 * Safely serializes a plain object to JSON (non-throwing).
 *
 * Wraps `JSON.stringify` and returns a Result containing
 * the JSON string representation of the object or an error.
 *
 * @template T - The input object type.
 * @param obj - The object to stringify.
 * @returns JSON string representation of the object or an error.
 */
export function tryStringifyObj<T extends object = Record<string, unknown>>(obj: T): Result<string> {
  return $stringifyObj(obj);
}

/**
 * Safely serializes a plain object to JSON.
 *
 * Wraps `JSON.stringify` and returns the result or throws an error.
 *
 * @template T - The input object type.
 * @param obj - The object to stringify.
 * @returns JSON string representation of the object.
 * @throws {Error} If `obj` is not a plain object or serialization fails.
 */
export function stringifyObj<T extends object = Record<string, unknown>>(obj: T): string {
  const { result, error } = $stringifyObj(obj);
  if (error) throw new Error($fmtResultErr(error));
  return result;
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
 * Safely parses a JSON string to a plain object (non-throwing).
 *
 * Wraps `JSON.parse` and returns a Result containing
 * the parsed object or an error if parsing fails.
 *
 * @template T - The expected object type.
 * @param str - The JSON string to parse.
 * @returns A Result containing the parsed object or an error.
 */
export function tryParseToObj<T extends object = Record<string, unknown>>(str: string): Result<{ result: T }> {
  return $parseToObj<T>(str);
}

/**
 * Safely parses a JSON string to a plain object.
 *
 * Wraps `JSON.parse` and returns the parsed object or throws an error if parsing fails.
 *
 * @template T - The expected object type.
 * @param str - The JSON string to parse.
 * @returns A parsed object.
 * @throws {Error} If the string cannot be parsed or does not represent a plain object.
 */
export function parseToObj<T extends object = Record<string, unknown>>(str: string): T {
  const { result, error } = $parseToObj<T>(str);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}
