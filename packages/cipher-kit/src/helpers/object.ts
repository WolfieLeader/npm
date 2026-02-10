import { $err, $fmtError, $fmtResultErr, $ok, type Result } from "./error.js";
import { $isPlainObj, $isStr } from "./validate.js";

export function $stringifyObj<T extends object = Record<string, unknown>>(obj: T): Result<string> {
  try {
    if (!$isPlainObj(obj)) return $err({ msg: "JSON: Invalid object", desc: "Input is not a plain object" });
    return $ok(JSON.stringify(obj));
  } catch (error) {
    return $err({ msg: "JSON: Stringify error", desc: $fmtError(error) });
  }
}

export function $parseToObj<T extends object = Record<string, unknown>>(str: string): Result<{ result: T }> {
  try {
    if (!$isStr(str)) return $err({ msg: "JSON: Invalid input", desc: "Input is not a valid string" });
    const obj = JSON.parse(str);

    if (!$isPlainObj(obj)) {
      return $err({ msg: "JSON: Invalid object format", desc: "Parsed data is not a plain object" });
    }

    return $ok({ result: obj as T });
  } catch (error) {
    return $err({ msg: "JSON: Invalid format", desc: $fmtError(error) });
  }
}

/**
 * Serializes a plain object to JSON (non-throwing).
 *
 * @returns `Result<string>` with the JSON string or error.
 * @see {@link stringifyObj} For full parameter/behavior docs.
 */
export function tryStringifyObj<T extends object = Record<string, unknown>>(obj: T): Result<string> {
  return $stringifyObj(obj);
}

/**
 * Serializes a plain object to JSON.
 *
 * @remarks
 * Only plain objects (POJOs) are accepted; class instances, Maps, Sets, etc. are rejected.
 *
 * @param obj - The object to stringify.
 * @returns JSON string representation of the object.
 * @throws {Error} If `obj` is not a plain object or serialization fails.
 *
 * @example
 * ```ts
 * const json = stringifyObj({ a: 1 }); // '{"a":1}'
 * ```
 *
 * @see {@link tryStringifyObj} Non-throwing variant returning `Result<string>`.
 */
export function stringifyObj<T extends object = Record<string, unknown>>(obj: T): string {
  const { result, error } = $stringifyObj(obj);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}

/**
 * Parses a JSON string to a plain object (non-throwing).
 *
 * @returns `Result<{ result: T }>` with the parsed object or error.
 * @see {@link parseToObj} For full parameter/behavior docs.
 */
export function tryParseToObj<T extends object = Record<string, unknown>>(str: string): Result<{ result: T }> {
  return $parseToObj<T>(str);
}

/**
 * Parses a JSON string to a plain object.
 *
 * @param str - The JSON string to parse.
 * @returns The parsed plain object.
 * @throws {Error} If the string can't be parsed or doesn't represent a plain object.
 *
 * @example
 * ```ts
 * const obj = parseToObj<{ a: number }>('{"a":1}'); // obj.a === 1
 * ```
 *
 * @see {@link tryParseToObj} Non-throwing variant returning `Result<{ result: T }>`.
 */
export function parseToObj<T extends object = Record<string, unknown>>(str: string): T {
  const { result, error } = $parseToObj<T>(str);
  if (error) throw new Error($fmtResultErr(error));
  return result;
}
