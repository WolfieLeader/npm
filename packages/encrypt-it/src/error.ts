import { $isObj } from './utils';

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

export function $err(typeOrErr: { message: string; description: string }): Result<never, ResultErr>;
export function $err(typeOrErr: ResultErr): Result<never, ResultErr>;
export function $err(typeOrErr: { message: string; description: string } | ResultErr): Result<never, ResultErr> {
  return { success: false, error: typeOrErr } as Result<never, ResultErr>;
}

export function $stringifyError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return String(error);
}
