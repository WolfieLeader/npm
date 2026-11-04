/** The runtime's native `crypto.subtle.timingSafeEqual` (Cloudflare Workers has one; the Web Crypto standard does not). */
function $nativeTimingSafeEqual(): ((a: Uint8Array, b: Uint8Array) => boolean) | undefined {
  const subtle: unknown = globalThis.crypto.subtle;
  if (typeof subtle !== "object" || subtle === null) return undefined;
  const native: unknown = Reflect.get(subtle, "timingSafeEqual");
  if (typeof native !== "function") return undefined;
  return (a, b) => Reflect.apply(native, subtle, [a, b]) === true;
}

/**
 * Compares two byte arrays in time that does not depend on where they differ.
 * Uses the runtime's native `crypto.subtle.timingSafeEqual` when it has one, otherwise a full loop with no early exit.
 * Arrays of different lengths are unequal; their lengths are not secret.
 */
export function $timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  const native = $nativeTimingSafeEqual();
  if (native) return native(a, b);
  let diff = 0;
  for (let i = 0; i < a.byteLength; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}
