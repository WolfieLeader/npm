import { $err, $fmtError, $ok, type Result } from "./error";
import { $isPlainObj, $isStr } from "./validate";

export function $stringifyObj<T extends object = Record<string, unknown>>(obj: T): Result<string> {
  try {
    if (!$isPlainObj(obj)) return $err({ msg: "Invalid object", desc: "Input is not a plain object" });
    return $ok(JSON.stringify(obj));
  } catch (error) {
    return $err({ msg: "JSON: Stringify error", desc: $fmtError(error) });
  }
}

export function $parseToObj<T extends object = Record<string, unknown>>(str: string): Result<{ result: T }> {
  try {
    if (!$isStr(str)) return $err({ msg: "JSON: Invalid input", desc: "Input is not a valid string" });
    const obj = JSON.parse(str);

    if (!$isPlainObj(obj))
      return $err({ msg: "JSON: Invalid object format", desc: "Parsed data is not a plain object" });
    return $ok({ result: obj as T });
  } catch (error) {
    return $err({ msg: "JSON: Invalid format", desc: $fmtError(error) });
  }
}
