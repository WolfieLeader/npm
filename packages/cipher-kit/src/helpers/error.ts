import { $isObj } from './validate';

export interface ResultErr {
  readonly message: string;
  readonly description: string;
}

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
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return String(error);
}

export function $fmtResultErr(err: ResultErr): string {
  return `${err.message} - ${err.description}`;
}
