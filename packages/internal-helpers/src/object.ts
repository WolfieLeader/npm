import { $err, $fmtError, $ok, type Result } from "./error.js";
import { $isPlainObj, $isStr } from "./validate.js";

class ProtoTraversalLimitError extends Error {
  constructor(limit: number) {
    super(`Object graph exceeded prototype-scan limit (${limit} nodes)`);
    this.name = "ProtoTraversalLimitError";
  }
}

const MAX_PROTO_SCAN_NODES = 100_000;

function $hasProtoKey(obj: unknown): boolean {
  if (typeof obj !== "object" || obj === null) return false;

  const seen = new WeakSet<object>();
  const stack: unknown[] = [obj];
  let scannedNodes = 0;

  while (stack.length > 0) {
    const current = stack.pop();
    if (typeof current !== "object" || current === null) continue;
    if (seen.has(current)) continue;

    seen.add(current);
    scannedNodes++;
    if (scannedNodes > MAX_PROTO_SCAN_NODES) {
      throw new ProtoTraversalLimitError(MAX_PROTO_SCAN_NODES);
    }

    if (Object.hasOwn(current, "__proto__")) return true;

    const currentObj = current as Record<string, unknown>;
    if (
      Object.hasOwn(currentObj, "constructor") &&
      typeof currentObj.constructor === "object" &&
      currentObj.constructor !== null &&
      Object.hasOwn(currentObj.constructor as object, "prototype") &&
      typeof (currentObj.constructor as Record<string, unknown>).prototype === "object" &&
      (currentObj.constructor as Record<string, unknown>).prototype !== null
    ) {
      return true;
    }

    for (const val of Object.values(currentObj)) {
      if (typeof val === "object" && val !== null) {
        stack.push(val);
      }
    }
  }

  return false;
}

export function $stringifyObj<T extends object = Record<string, unknown>>(obj: T): Result<string> {
  if (!$isPlainObj(obj))
    return $err({
      message: "stringifyObj: Input must be a plain object",
      description: "Only plain objects ({...}) are accepted, not arrays, class instances, or built-ins",
    });
  try {
    return $ok(JSON.stringify(obj));
  } catch (error) {
    return $err({ message: "stringifyObj: Failed to stringify object", description: $fmtError(error) });
  }
}

export function $parseToObj<T extends object = Record<string, unknown>>(str: string): Result<{ result: T }> {
  if (!$isStr(str))
    return $err({
      message: "parseToObj: Input must be a non-empty string",
      description: "Expected a non-empty JSON string to parse",
    });

  try {
    const obj = JSON.parse(str);

    if (!$isPlainObj(obj)) {
      return $err({
        message: "parseToObj: Parsed data is not a plain object",
        description: "JSON parsed successfully but the result is not a plain object (e.g. array, string, number)",
      });
    }

    if ($hasProtoKey(obj)) {
      return $err({
        message: "parseToObj: Input contains a prototype pollution vector",
        description: "Objects with __proto__ or constructor.prototype keys are rejected",
      });
    }

    return $ok({ result: obj as T });
  } catch (error) {
    if (error instanceof ProtoTraversalLimitError) {
      return $err({
        message: "parseToObj: Input object is too deeply nested to validate safely",
        description: error.message,
      });
    }
    return $err({ message: "parseToObj: Failed to parse JSON", description: $fmtError(error) });
  }
}
