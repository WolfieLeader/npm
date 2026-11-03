import { $err, $ok } from "./error.js";
import type { ErrResult, Result } from "./error.js";
import { $isPlainObj, $isStr } from "./validate.js";

/**
 * Maximum number of objects and arrays (combined, root included) that `$stringifyObj` and
 * `$parseToObj` accept. Both sides enforce the same limit, so anything that stringifies also parses.
 */
export const MAX_OBJ_CONTAINERS = 100_000;

const LIMIT_DESCRIPTION = `The limit is ${MAX_OBJ_CONTAINERS.toLocaleString("en-US")} objects and arrays combined`;

function $isObjLike(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

/** True when `obj` has `__proto__` as an own key, or a `constructor` object with an object `prototype`. */
function $isPollutionVector(obj: Record<string, unknown>): boolean {
  if (Object.hasOwn(obj, "__proto__")) return true;
  if (!Object.hasOwn(obj, "constructor")) return false;
  const ctor = obj.constructor;
  return $isObjLike(ctor) && Object.hasOwn(ctor, "prototype") && $isObjLike(ctor.prototype);
}

/** Scans the object graph for prototype pollution vectors. Iterative, so deep nesting cannot overflow the stack. */
function $scanProtoKeys(root: object): "clean" | "polluted" | "limit" {
  const seen = new WeakSet<object>();
  const stack: unknown[] = [root];
  let scanned = 0;

  while (stack.length > 0) {
    const current = stack.pop();
    if (!$isObjLike(current) || seen.has(current)) continue;
    seen.add(current);
    // Backstop only: the JSON pre-scan already enforces this limit.
    if (++scanned > MAX_OBJ_CONTAINERS) return "limit";
    if ($isPollutionVector(current)) return "polluted";

    for (const val of Object.values(current)) {
      if ($isObjLike(val)) stack.push(val);
    }
  }
  return "clean";
}

/** Index just past the closing quote of the JSON string that opens at `start`. */
function $skipJsonString(json: string, start: number): number {
  let i = start + 1;
  while (i < json.length) {
    // Only ASCII code units are compared, so a surrogate pair's code point never matches.
    const c = json.codePointAt(i);
    if (c === 34) return i + 1; // closing "
    i += c === 92 ? 2 : 1; // a backslash escapes the next char
  }
  return i;
}

/** True when the JSON text opens more than `MAX_OBJ_CONTAINERS` objects and arrays. Linear time. */
function $exceedsContainerLimit(json: string): boolean {
  let count = 0;
  let i = 0;
  while (i < json.length) {
    const c = json.codePointAt(i);
    if (c === 34) {
      i = $skipJsonString(json, i);
      continue;
    }
    if (c === 123 || c === 91) count++; // { or [
    if (count > MAX_OBJ_CONTAINERS) return true;
    i++;
  }
  return false;
}

function $pollutionErr(prefix: string): ErrResult {
  return $err({
    message: `${prefix}: Object contains a prototype pollution vector`,
    description: "Objects with __proto__ or constructor.prototype keys are rejected",
  });
}

function $limitErr(prefix: string): ErrResult {
  return $err({ message: `${prefix}: Object has too many nested objects or arrays`, description: LIMIT_DESCRIPTION });
}

export function $stringifyObj<T extends object = Record<string, unknown>>(obj: T): Result<string> {
  if (!$isPlainObj(obj))
    return $err({
      message: "stringifyObj: Input must be a plain object",
      description: "Only plain objects ({...}) are accepted, not arrays, class instances, or built-ins",
    });

  let json: string | undefined;
  try {
    json = JSON.stringify(obj);
  } catch {
    // Engine messages can quote property names, so use a fixed description.
    return $err({
      message: "stringifyObj: Failed to stringify object",
      description:
        "The object contains a value JSON cannot serialize (such as a BigInt or a circular reference) or is nested too deeply",
    });
  }

  // A root `toJSON` that returns undefined makes JSON.stringify return undefined, despite its `string` type.
  if (typeof json !== "string") {
    return $err({
      message: "stringifyObj: Failed to stringify object",
      description: "The object's toJSON method returned a value JSON cannot represent",
    });
  }
  // Read the output back exactly as $parseToObj will, so anything written can be read.
  const readBack = $readJson(json, "stringifyObj");
  return readBack.success ? $ok(json) : readBack;
}

/** Parses JSON text into a plain object, enforcing the container limit and rejecting prototype pollution vectors. */
function $readJson<T extends object>(json: string, prefix: string): Result<{ result: T }> {
  if ($exceedsContainerLimit(json)) return $limitErr(prefix);

  let obj: unknown;
  try {
    obj = JSON.parse(json);
  } catch {
    // Engine messages quote the input, which may be decrypted plaintext, so use a fixed description.
    return $err({ message: `${prefix}: Failed to parse JSON`, description: "The input is not valid JSON" });
  }

  if (!$isPlainObj<T>(obj)) {
    return $err({
      message: `${prefix}: Data is not a plain object`,
      description: "The JSON is valid but is not a plain object (e.g. array, string, number)",
    });
  }

  const scan = $scanProtoKeys(obj);
  if (scan === "limit") return $limitErr(prefix);
  if (scan === "polluted") return $pollutionErr(prefix);
  return $ok({ result: obj });
}

export function $parseToObj<T extends object = Record<string, unknown>>(str: string): Result<{ result: T }> {
  if (!$isStr(str))
    return $err({
      message: "parseToObj: Input must be a non-empty string",
      description: "Expected a non-empty JSON string to parse",
    });

  return $readJson<T>(str, "parseToObj");
}
