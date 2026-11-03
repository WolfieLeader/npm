/**
 * Compares two byte arrays without returning early, so the time taken does not depend on where they differ.
 * Arrays of different lengths are unequal; their lengths are not secret.
 */
export function $timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < a.byteLength; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}
