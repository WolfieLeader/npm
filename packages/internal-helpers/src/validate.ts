/** True for a string whose trimmed length is at least `min` (default 1). Whitespace-only strings fail. */
export function $isStr(x: unknown, min = 1): x is string {
  return typeof x === "string" && x.trim().length >= min;
}

/** String iteration yields a valid surrogate pair as one code point and a lone surrogate on its own. */
function $hasLoneSurrogate(str: string): boolean {
  for (const char of str) {
    const code = char.codePointAt(0) ?? 0;
    if (code >= 0xd8_00 && code <= 0xdf_ff) return true;
  }
  return false;
}

/**
 * True for a well-formed string (no lone UTF-16 surrogates) with at least `min` code units (default 0).
 * Unlike `$isStr`, whitespace counts toward the length.
 */
export function $isWellFormedStr(x: unknown, min = 0): x is string {
  if (typeof x !== "string" || x.length < min) return false;
  // `String.prototype.isWellFormed` (ES2024) is missing from the ES2023 lib and from older runtimes.
  const native: unknown = Reflect.get(String.prototype, "isWellFormed");
  return typeof native === "function" ? native.call(x) === true : !$hasLoneSurrogate(x);
}

export function $isIntIn<T extends number>(x: unknown, min: number, max: number): x is T {
  return typeof x === "number" && Number.isInteger(x) && x >= min && x <= max;
}

export function $isPlainObj<T extends object = Record<string, unknown>>(x: unknown): x is T {
  if (typeof x !== "object" || x === null) return false;
  const proto: unknown = Object.getPrototypeOf(x);
  return proto === Object.prototype || proto === null;
}
