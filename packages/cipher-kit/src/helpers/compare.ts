/** Cloudflare Workers adds a non-standard `timingSafeEqual` to `crypto.subtle`; standard Web Crypto has none. */
type SubtleWithCompare = typeof globalThis.crypto.subtle & {
  timingSafeEqual?: (a: Uint8Array, b: Uint8Array) => unknown;
};

/**
 * Compares two byte arrays in time that does not depend on where they differ.
 * Uses the runtime's native `crypto.subtle.timingSafeEqual` when it has one, otherwise a full loop with no early exit.
 * Arrays of different lengths are unequal; their lengths are not secret.
 */
export function $timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  const subtle: SubtleWithCompare = globalThis.crypto.subtle;
  if (typeof subtle.timingSafeEqual === "function") return subtle.timingSafeEqual(a, b) === true;
  let diff = 0;
  for (let i = 0; i < a.byteLength; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}
