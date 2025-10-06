import { $isPlainObj } from "./validate";

/**
 * Standardized error object for the `Result` type.
 * Always has a brief `message` and a more detailed `description`.
 */
export interface ErrorStruct {
  readonly message: string;
  readonly description: string;
}

type ReservedWords<Obj extends object> = "success" extends keyof Obj ? never : "error" extends keyof Obj ? never : Obj;

type OkType<T> = {
  readonly success: true;
  readonly error?: undefined;
} & (T extends object ? ReservedWords<{ readonly [K in keyof T]: T[K] }> : { readonly result: T });

type ErrType<T> = {
  readonly success: false;
  readonly error: ErrorStruct;
} & (T extends object ? ReservedWords<{ readonly [K in keyof T]?: undefined }> : { readonly result?: undefined });

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
export type Result<T> = OkType<T> | ErrType<T>;

export function $ok<T>(result: T): Result<T> {
  if ($isPlainObj(result)) return { success: true, ...(result as T & object) } as Result<T>;
  return { success: true, result } as Result<T>;
}

interface ShortErrorStruct {
  readonly msg: string;
  readonly desc: string;
}

export function $err(err: ShortErrorStruct | ErrorStruct): Result<never> {
  return {
    success: false,
    error: {
      message: "msg" in err ? err.msg : err.message,
      description: "desc" in err ? err.desc : err.description,
    },
  } as Result<never>;
}

export function $fmtError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return String(error);
}

export function $fmtResultErr(err: ErrorStruct | undefined): string {
  if (!err) return "Unknown error";
  return `${err.message} - ${err.description}`;
}
