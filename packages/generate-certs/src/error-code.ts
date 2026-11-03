/** Returns the `code` of a Node.js system error (`ENOENT`, `EEXIST`, …), or `undefined` when it has none. */
export function $errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}
