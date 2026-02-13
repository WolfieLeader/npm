import { $isPlainObj } from "./validate.js";

export interface ErrorStruct {
  readonly message: string;
  readonly description: string;
}

type ReservedResultKeys = "success" | "error";

type ShouldWrapObject<T extends object> = Extract<keyof T, ReservedResultKeys> extends never ? false : true;

type OkType<T> = {
  readonly success: true;
  readonly error?: undefined;
} & (T extends object
  ? ShouldWrapObject<T> extends true
    ? { readonly result: T }
    : { readonly [K in keyof T]: T[K] }
  : { readonly result: T });

type ErrType<T> = {
  readonly success: false;
  readonly error: ErrorStruct;
} & (T extends object
  ? ShouldWrapObject<T> extends true
    ? { readonly result?: undefined }
    : { readonly [K in keyof T]?: undefined }
  : { readonly result?: undefined });

export type Result<T> = OkType<T> | ErrType<T>;

export function $ok<T>(result: T): Result<T> {
  if ($isPlainObj(result)) {
    const obj = result as Record<string, unknown>;
    if (Object.hasOwn(obj, "success") || Object.hasOwn(obj, "error")) {
      return { success: true, result } as Result<T>;
    }
    return { success: true, ...obj } as Result<T>;
  }
  return { success: true, result } as Result<T>;
}

export function $err(err: ErrorStruct): Result<never> {
  return {
    success: false,
    error: { message: err.message, description: err.description },
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
