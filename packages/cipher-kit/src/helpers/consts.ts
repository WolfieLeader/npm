export const ENCODING_FORMATS = Object.freeze(['base64', 'base64url', 'hex', 'utf8', 'latin1'] as const);

export const DIGEST_ALGORITHMS = Object.freeze({
  sha256: { node: 'sha256', web: 'SHA-256' },
  sha384: { node: 'sha384', web: 'SHA-384' },
  sha512: { node: 'sha512', web: 'SHA-512' },
} as const);

export const ENCRYPTION_ALGORITHMS = Object.freeze({
  aes256gcm: { name: 'aes256gcm', keyBytes: 32, ivLength: 12, node: 'aes-256-gcm', web: 'AES-GCM' },
  aes192gcm: { name: 'aes192gcm', keyBytes: 24, ivLength: 12, node: 'aes-192-gcm', web: 'AES-GCM' },
  aes128gcm: { name: 'aes128gcm', keyBytes: 16, ivLength: 12, node: 'aes-128-gcm', web: 'AES-GCM' },
} as const);

export const PASSWORD_HASHING = Object.freeze({
  pbkdf2: { saltLength: 16, iterations: 320_000, keyLength: 64 },
} as const);
