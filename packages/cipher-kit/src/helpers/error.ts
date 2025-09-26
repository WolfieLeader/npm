import { $isObj } from './validate';

/**
 * Standardized error object for Result type.
 * Includes a `message` and a `description`.
 */
export interface ResultErr {
  readonly message: string;
  readonly description: string;
}

/**
 * Result type for functions that can succeed or fail.
 *
 * On success, returns an object with `success: true` and the result data.
 * On failure, returns an object with `success: false` and an error object.
 *
 * If the result type `T` is an object, its properties are merged into the success result.
 * Otherwise, the result is returned under the `result` key.
 *
 * @example
 * ```ts
 * function returnNumber(): Result<number> {
 *   return $ok(123);
 * }
 *
 * function returnObject(): Result<{ a: number; b: string }> {
 *  return $ok({ a: 1, b: 'a' });
 * }
 *
 * function example() {
 *  const res = returnNumber();
 *  if (res.success) {
 *   console.log(res.result); // 123
 *  } else {
 *   console.error(res.error);
 *  }
 *
 * const {a, b, success, error} = returnObject();
 * if (success) {
 *   console.log(a, b); // 1 'a'
 * } else {
 *   console.error(error);
 * }
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
      message: 'msg' in err ? err.msg : err.message,
      description: 'desc' in err ? err.desc : err.description,
    },
  } as Result<never, ResultErr>;
}

export function $fmtError(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  return String(error);
}

export function $fmtResultErr(err: ResultErr | undefined): string {
  if (!err) return 'Unknown error';
  return `${err.message} - ${err.description}`;
}

export function title(platform: 'web' | 'node', title: string): string {
  return `${platform === 'web' ? 'Crypto Web API' : 'Crypto NodeJS API'} - ${title}`;
}
