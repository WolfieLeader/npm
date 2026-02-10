import { $isPlainObj } from "./validate.js";

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
