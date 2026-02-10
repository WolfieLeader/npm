export function $isStr(x: unknown, min = 1): x is string {
  return x !== null && x !== undefined && typeof x === "string" && x.trim().length >= min;
}

export function $isIntIn<T extends number>(x: unknown, min: number, max: number): x is T {
  return typeof x === "number" && Number.isInteger(x) && x >= min && x <= max;
}

export function $isPlainObj<T extends object = Record<string, unknown>>(x: unknown): x is T {
  if (typeof x !== "object" || x === null || x === undefined) return false;
  const proto = Object.getPrototypeOf(x);
  return proto === Object.prototype || proto === null;
}
