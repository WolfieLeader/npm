export const COMPRESSION_REGEX = Object.freeze({
  GENERAL: /^[A-Za-z0-9\-_]+\.(0|1)\.$/,
  UNCOMPRESSED: /^[A-Za-z0-9\-_]+\.0\.$/,
  COMPRESSED: /^[A-Za-z0-9\-_]+\.1\.$/,
});

export function isInCompressionFormat(data: string): boolean {
  return typeof data === 'string' && COMPRESSION_REGEX.GENERAL.test(data);
}

export function isInCompressedFormat(data: string): boolean {
  return typeof data === 'string' && COMPRESSION_REGEX.COMPRESSED.test(data);
}

export function isInUncompressedFormat(data: string): boolean {
  return typeof data === 'string' && COMPRESSION_REGEX.UNCOMPRESSED.test(data);
}

export function $isStr(value: unknown, min = 1): value is string {
  return value !== null && value !== undefined && typeof value === 'string' && value.trim().length >= min;
}

export function $isObj(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    value !== undefined &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
  );
}
