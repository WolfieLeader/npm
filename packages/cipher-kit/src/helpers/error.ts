import { $isObj } from "./validate";

/**
 * Standardized error object for the `Result` type.
 * Always has a brief `message` and a more detailed `description`.
 */
export interface ResultErr {
  readonly message: string;
  readonly description: string;
}

/**
 * Discriminated union for functions that can succeed or fail.
 *
 * - On **success**:
 *   - If `T` is an object - properties of `T` are **spread** into the result
 *     along with `success: true`.
 *   - Otherwise - `{ success: true, result: T }`.
 * - On **failure**: `{ success: false, error: E }`.
 *
 * @example
 * ```ts
 * // Primitive result
 * function getNum(): Result<number> {
 *   return $ok(42);
 * }
 * const r1 = getNum();
 * if (r1.success) console.log(r1.result); // 42
 *
 * // Object result (spread)
 * function getObject(): Result<{ name: string; age: number }> {
 *   return $ok({ name: 'Alice', age: 30 });
 * }
 * const r2 = getObject();
 * if (r2.success) console.log(r2.name, r2.age); // 'Alice' 30
 * ```
 */
export type Result<T, E = ResultErr> = T extends object
  ?
      | ({ readonly [K in keyof T]: T[K] } & { readonly success: true; readonly error?: undefined })
      | ({ readonly [K in keyof T]?: undefined } & { readonly success: false; readonly error: E })
  :
      | { readonly success: true; readonly result: T; readonly error?: undefined }
      | { readonly success: false; readonly error: E; readonly result?: undefined };

export function $ok<T>(result?: T): Result<T> {
  if ($isObj(result)) return { success: true, ...(result as T & object) } as Result<T>;
  return { success: true, result } as Result<T>;
}

export function $err(err: { msg: string; desc: string }): Result<never, ResultErr>;
export function $err(err: ResultErr): Result<never, ResultErr>;
export function $err(err: { msg: string; desc: string } | ResultErr): Result<never, ResultErr> {
  return {
    success: false,
    error: {
      message: "msg" in err ? err.msg : err.message,
      description: "desc" in err ? err.desc : err.description,
    },
  } as Result<never, ResultErr>;
}

export function $fmtError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return String(error);
}

export function $fmtResultErr(err: ResultErr | undefined): string {
  if (!err) return "Unknown error";
  return `${err.message} - ${err.description}`;
}

export function title(platform: "web" | "node", title: string): string {
  return `${platform === "web" ? "Crypto Web API" : "Crypto NodeJS API"} - ${title}`;
}
