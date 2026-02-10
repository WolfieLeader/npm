export { CIPHER_ENCODING, ENCODING } from "@internal/helpers";

export const DIGEST_ALGORITHMS = Object.freeze({
  sha256: { node: "sha256", web: "SHA-256" },
  sha384: { node: "sha384", web: "SHA-384" },
  sha512: { node: "sha512", web: "SHA-512" },
} as const);

export const ENCRYPTION_ALGORITHMS = Object.freeze({
  aes256gcm: { keyBytes: 32, ivLength: 12, node: "aes-256-gcm", web: "AES-GCM" },
  aes192gcm: { keyBytes: 24, ivLength: 12, node: "aes-192-gcm", web: "AES-GCM" },
  aes128gcm: { keyBytes: 16, ivLength: 12, node: "aes-128-gcm", web: "AES-GCM" },
} as const);
