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
 * Safely serializes a plain object to JSON without throwing.
 *
 * Wraps `JSON.stringify` and returns a `Result` containing the JSON string or an error.
 * Only plain objects (POJOs) are accepted. Class instances, Maps, Sets, etc. are rejected.
 *
 * ### 🍼 Explain Like I'm Five
 * You have a box of toys (your object) and take a photo of it (a JSON string)
 * so you can send it to a friend.
 *
 * @template T - Plain object type to serialize.
 * @param obj - The object to stringify (must be a plain object).
 * @returns A `Result` with the JSON string on success, or an error.
 *
 * @example
 * ```ts
 * const res = tryStringifyObj({ a: 1 });
 * if (res.success) {
 *   console.log(res.result); // {"a":1}
 * } else {
 *   console.error(res.error.message, res.error.description);
 * }
 * ```
 */
export function tryStringifyObj<T extends object = Record<string, unknown>>(obj: T): Result<string> {
  return $stringifyObj(obj);
}

/**
 * Serializes a plain object to JSON (throwing).
 *
 * Wraps `JSON.stringify` and returns the result or throws an error.
 * Only plain objects (POJOs) are accepted. Class instances, Maps, Sets, etc. are rejected.
 *
 * ### 🍼 Explain Like I'm Five
 * You have a box of toys (your object) and take a photo of it (a JSON string)
 * so you can send it to a friend.
 *
 * @template T - Plain object type to serialize.
 * @param obj - The object to stringify (must be a plain object).
 * @returns JSON string representation of the object.
 * @throws {Error} If `obj` is not a plain object or serialization fails.
 *
 * @example
 * ```ts
 * try {
 * const json = stringifyObj({ a: 1 }); // {"a":1}
 * } catch (error: unknown) {
 *   console.error(error);
 * }
 * ```
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
 * Wraps `JSON.parse` and returns a `Result` containing the parsed object, or an error.
 *
 * ### 🍼 Explain Like I'm Five
 * You rebuild your toy box (an object) from a photo you took (a JSON string).
 *
 * @template T - The expected object type.
 * @param str - The JSON string to parse.
 * @returns A `Result` with the parsed object on success, or an error.
 *
 * @example
 * ```ts
 * const res = tryParseToObj<{ a: number }>('{"a":1}');
 * if (res.success) {
 *   console.log(res.result.a); // 1
 * } else {
 *   console.error(res.error.message, res.error.description);
 * }
 * ```
 */
export function tryParseToObj<T extends object = Record<string, unknown>>(str: string): Result<{ result: T }> {
  return $parseToObj<T>(str);
}

/**
 * Parses a JSON string to a plain object (throwing).
 *
 * Wraps `JSON.parse` and returns the parsed object, or throws on failure.
 *
 * ### 🍼 Explain Like I'm Five
 * You rebuild your toy box (an object) from a photo you took (a JSON string).
 *
 * @template T - The expected object type.
 * @param str - The JSON string to parse.
 * @returns The parsed plain object.
 * @throws {Error} If the string can’t be parsed or doesn’t represent a plain object.
 *
 * @example
 * ```ts
 * try {
 *   const obj = parseToObj<{ a: number }>('{"a":1}'); // obj.a === 1
 * } catch (error: unknown) {
 *   console.error(error);
 * }
 * ```
 */
export function parseToObj<T extends object = Record<string, unknown>>(str: string): T {
  const { result, error } = $parseToObj<T>(str);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}
