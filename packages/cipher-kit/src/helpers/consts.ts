export { CIPHER_ENCODING, ENCODING } from "@internal/helpers";

export const GCM_TAG_BYTES = 16;
export const GCM_IV_LENGTH = 12;

export const MAX_PBKDF2_ITERATIONS = 10_000_000;
export const MAX_PBKDF2_KEY_LENGTH = 1024;
export const MAX_PBKDF2_SALT_LENGTH = 1024;
export const MIN_HMAC_LENGTH = 8;
export const MIN_RANDOM_TOKEN_BYTES = 8;
export const MAX_RANDOM_TOKEN_BYTES = 1024;
export const MIN_RANDOM_CODE_DIGITS = 4;
export const MAX_RANDOM_CODE_DIGITS = 9;

/** HKDF `info` limit in UTF-8 bytes (Node enforces it; enforced upfront on both platforms). */
export const MAX_HKDF_INFO_BYTES = 1024;
/** AES-GCM `additionalData` limit in bytes (strings measured in UTF-8), enforced on both platforms. */
export const MAX_ADDITIONAL_DATA_BYTES = 65_536;

export const DIGEST_ALGORITHMS = {
  sha256: { node: "sha256", web: "SHA-256", bytes: 32 },
  sha384: { node: "sha384", web: "SHA-384", bytes: 48 },
  sha512: { node: "sha512", web: "SHA-512", bytes: 64 },
} as const;
Object.freeze(DIGEST_ALGORITHMS);

export const ENCRYPTION_ALGORITHMS = {
  aes256gcm: { keyBytes: 32, node: "aes-256-gcm", web: "AES-GCM" },
  aes192gcm: { keyBytes: 24, node: "aes-192-gcm", web: "AES-GCM" },
  aes128gcm: { keyBytes: 16, node: "aes-128-gcm", web: "AES-GCM" },
} as const;
Object.freeze(ENCRYPTION_ALGORITHMS);
