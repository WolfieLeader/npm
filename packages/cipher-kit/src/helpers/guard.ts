import { $err } from "@internal/helpers";
import type { ErrResult, Result } from "@internal/helpers";

function $unexpected(ctx: string, error: unknown): ErrResult {
  // Report only the error type: an engine message could quote secret input.
  const kind = error instanceof Error ? error.name : typeof error;
  return $err({ message: `${ctx}: Unexpected error`, description: `An unexpected ${kind} was thrown internally` });
}

/** Runs `fn` and turns any thrown value into an error `Result`, so `try*` functions never throw. */
export function $guard<T>(ctx: string, fn: () => Result<T>): Result<T> {
  try {
    return fn();
  } catch (error) {
    return $unexpected(ctx, error);
  }
}

/** Async variant of {@link $guard}: also turns rejections into an error `Result`. */
export async function $guardAsync<T>(ctx: string, fn: () => Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await fn();
  } catch (error) {
    return $unexpected(ctx, error);
  }
}
