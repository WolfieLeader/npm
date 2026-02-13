import { $err, $isIntIn, $isPlainObj, $isStr, $ok, type Result } from "@internal/helpers";
import {
  CIPHER_ENCODING,
  DIGEST_ALGORITHMS,
  ENCRYPTION_ALGORITHMS,
  MAX_PBKDF2_ITERATIONS,
  MAX_PBKDF2_KEY_LENGTH,
  MAX_PBKDF2_SALT_LENGTH,
} from "./consts.js";
import type {
  CreateSecretKeyOptions,
  HashPasswordOptions,
  ValidatedHashOptions,
  ValidatedKdfOptions,
  ValidatedVerifyOptions,
  VerifyPasswordOptions,
} from "./types.js";

export function $isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

const expectedKeys = new Set(["platform", "digest", "algorithm", "key", "injected"]);

export function $validateSecretKeyBase(
  x: unknown,
  platform: "node" | "web",
): {
  obj: Record<string, unknown>;
  algorithm: (typeof ENCRYPTION_ALGORITHMS)[keyof typeof ENCRYPTION_ALGORITHMS];
} | null {
  if (!$isObj(x) || (platform !== "node" && platform !== "web") || x.platform !== platform) return null;

  const keys = Object.keys(x);
  if (keys.length !== expectedKeys.size) return null;
  for (const key of keys) if (!expectedKeys.has(key)) return null;

  if (
    typeof x.digest !== "string" ||
    !(x.digest in DIGEST_ALGORITHMS) ||
    typeof x.algorithm !== "string" ||
    !(x.algorithm in ENCRYPTION_ALGORITHMS) ||
    !$isObj(x.key) ||
    x.key.type !== "secret"
  ) {
    return null;
  }

  const algorithm = ENCRYPTION_ALGORITHMS[x.algorithm as keyof typeof ENCRYPTION_ALGORITHMS];

  if (
    !$isObj(x.injected) ||
    x.injected.keyBytes !== algorithm.keyBytes ||
    x.injected.node !== algorithm.node ||
    x.injected.web !== algorithm.web
  ) {
    return null;
  }

  return { obj: x, algorithm };
}

/** Matches the `"iv.cipher.tag."` encrypted payload format. */
export const ENCRYPTED_REGEX =
  /^([A-Za-z0-9+/_-][A-Za-z0-9+/=_-]*)\.([A-Za-z0-9+/_-][A-Za-z0-9+/=_-]*)\.([A-Za-z0-9+/_-][A-Za-z0-9+/=_-]*)\.$/;

/** Validates structural shape only, not whether content is valid base64/hex. */
export function matchEncryptedPattern(data: string): boolean {
  return typeof data === "string" && ENCRYPTED_REGEX.test(data);
}

export function $validateCreateSecretKeyOptions(
  secret: string,
  options: CreateSecretKeyOptions,
  prefix: string,
): Result<ValidatedKdfOptions> {
  if (!$isStr(secret, 8)) {
    return $err({
      message: `${prefix} createSecretKey: Secret must be at least 8 characters`,
      description: "Use a high-entropy string of at least 8 characters",
    });
  }

  if (!$isPlainObj<CreateSecretKeyOptions>(options)) {
    return $err({
      message: `${prefix} createSecretKey: Options must be a plain object`,
      description: 'Pass an object like { algorithm: "aes256gcm" }',
    });
  }

  const algorithm = options.algorithm ?? "aes256gcm";
  if (!(algorithm in ENCRYPTION_ALGORITHMS)) {
    return $err({
      message: `${prefix} createSecretKey: Unsupported algorithm: ${algorithm}`,
      description: `Supported algorithms are: ${Object.keys(ENCRYPTION_ALGORITHMS).join(", ")}`,
    });
  }

  const digest = options.digest ?? "sha256";
  if (!(digest in DIGEST_ALGORITHMS)) {
    return $err({
      message: `${prefix} createSecretKey: Unsupported digest: ${digest}`,
      description: `Supported digests are: ${Object.keys(DIGEST_ALGORITHMS).join(", ")}`,
    });
  }

  const salt = options.salt ?? "cipher-kit";
  if (!$isStr(salt, 8)) {
    return $err({
      message: `${prefix} createSecretKey: Salt must be at least 8 characters`,
      description: "Provide a salt string with at least 8 characters",
    });
  }

  const info = options.info ?? "cipher-kit";
  if (!$isStr(info)) {
    return $err({
      message: `${prefix} createSecretKey: Info must be a non-empty string`,
      description: "Received empty or non-string value",
    });
  }

  return $ok({
    algorithm,
    digest,
    salt,
    info,
    encryptAlgo: ENCRYPTION_ALGORITHMS[algorithm],
    digestAlgo: DIGEST_ALGORITHMS[digest],
  });
}

export function $validateHashPasswordOptions(
  password: string,
  options: HashPasswordOptions,
  prefix: string,
): Result<ValidatedHashOptions> {
  if (!$isStr(password)) {
    return $err({
      message: `${prefix} hashPassword: Password must be a non-empty string`,
      description: "Received empty or non-string value",
    });
  }

  if (!$isPlainObj<HashPasswordOptions>(options)) {
    return $err({
      message: `${prefix} hashPassword: Options must be a plain object`,
      description: "Pass an object like { iterations: 320000 }",
    });
  }

  const digest = options.digest ?? "sha512";
  if (!(digest in DIGEST_ALGORITHMS)) {
    return $err({
      message: `${prefix} hashPassword: Unsupported digest: ${digest}`,
      description: `Supported digests are: ${Object.keys(DIGEST_ALGORITHMS).join(", ")}`,
    });
  }

  const outputEncoding = options.outputEncoding ?? "base64url";
  if (!CIPHER_ENCODING.includes(outputEncoding)) {
    return $err({
      message: `${prefix} hashPassword: Unsupported output encoding: ${outputEncoding}`,
      description: "Use base64, base64url, or hex",
    });
  }

  const saltLength = options.saltLength ?? 16;
  if (!$isIntIn(saltLength, 8, MAX_PBKDF2_SALT_LENGTH)) {
    return $err({
      message: `${prefix} hashPassword: Salt length must be at least 8 bytes`,
      description: `Must be an integer between 8 and ${MAX_PBKDF2_SALT_LENGTH} (recommended 16 or more)`,
    });
  }

  const iterations = options.iterations ?? 320_000;
  if (!$isIntIn(iterations, 100_000, MAX_PBKDF2_ITERATIONS)) {
    return $err({
      message: `${prefix} hashPassword: Iterations must be at least 100,000`,
      description: `Must be an integer between 100,000 and ${MAX_PBKDF2_ITERATIONS} (recommended 320,000 or more)`,
    });
  }

  const keyLength = options.keyLength ?? 64;
  if (!$isIntIn(keyLength, 16, MAX_PBKDF2_KEY_LENGTH)) {
    return $err({
      message: `${prefix} hashPassword: Key length must be at least 16 bytes`,
      description: `Must be an integer between 16 and ${MAX_PBKDF2_KEY_LENGTH} (recommended 64 or more)`,
    });
  }

  return $ok({
    digest,
    digestAlgo: DIGEST_ALGORITHMS[digest],
    outputEncoding,
    saltLength,
    iterations,
    keyLength,
  });
}

function $maxEncodedLength(byteLength: number, encoding: (typeof CIPHER_ENCODING)[number]): number {
  if (encoding === "hex") return byteLength * 2;
  return Math.ceil(byteLength / 3) * 4;
}

export function $validateVerifyPasswordOptions(
  password: string,
  hashedPassword: string,
  salt: string,
  options: VerifyPasswordOptions,
  prefix: string,
): Result<ValidatedVerifyOptions> {
  if (!$isStr(password)) {
    return $err({
      message: `${prefix} verifyPassword: Password must be a non-empty string`,
      description: "Received empty or non-string value",
    });
  }

  if (!$isStr(hashedPassword)) {
    return $err({
      message: `${prefix} verifyPassword: Hashed password must be a non-empty string`,
      description: "Pass the hash string returned by hashPassword()",
    });
  }

  if (!$isStr(salt)) {
    return $err({
      message: `${prefix} verifyPassword: Salt must be a non-empty string`,
      description: "Pass the salt string returned by hashPassword()",
    });
  }

  if (!$isPlainObj<VerifyPasswordOptions>(options)) {
    return $err({
      message: `${prefix} verifyPassword: Options must be a plain object`,
      description: "Pass an object matching the options used for hashPassword()",
    });
  }

  const digest = options.digest ?? "sha512";
  if (!(digest in DIGEST_ALGORITHMS)) {
    return $err({
      message: `${prefix} verifyPassword: Unsupported digest: ${digest}`,
      description: `Supported digests are: ${Object.keys(DIGEST_ALGORITHMS).join(", ")}`,
    });
  }

  const inputEncoding = options.inputEncoding ?? "base64url";
  if (!CIPHER_ENCODING.includes(inputEncoding)) {
    return $err({
      message: `${prefix} verifyPassword: Unsupported input encoding: ${inputEncoding}`,
      description: "Use base64, base64url, or hex",
    });
  }

  const iterations = options.iterations ?? 320_000;
  if (!$isIntIn(iterations, 100_000, MAX_PBKDF2_ITERATIONS)) {
    return $err({
      message: `${prefix} verifyPassword: Iterations must be at least 100,000`,
      description: `Must be an integer between 100,000 and ${MAX_PBKDF2_ITERATIONS}`,
    });
  }

  const keyLength = options.keyLength ?? 64;
  if (!$isIntIn(keyLength, 16, MAX_PBKDF2_KEY_LENGTH)) {
    return $err({
      message: `${prefix} verifyPassword: Key length must be at least 16 bytes`,
      description: `Must be an integer between 16 and ${MAX_PBKDF2_KEY_LENGTH}`,
    });
  }

  const maxHashLen = $maxEncodedLength(keyLength, inputEncoding);
  if (hashedPassword.length > maxHashLen) {
    return $err({
      message: `${prefix} verifyPassword: Hashed password exceeds maximum encoded length`,
      description: `Expected at most ${maxHashLen} characters for ${keyLength}-byte key with ${inputEncoding} encoding`,
    });
  }

  const maxSaltLen = $maxEncodedLength(MAX_PBKDF2_SALT_LENGTH, inputEncoding);
  if (salt.length > maxSaltLen) {
    return $err({
      message: `${prefix} verifyPassword: Salt exceeds maximum encoded length`,
      description: `Expected at most ${maxSaltLen} characters for ${inputEncoding} encoding`,
    });
  }

  return $ok({
    digest,
    digestAlgo: DIGEST_ALGORITHMS[digest],
    inputEncoding,
    iterations,
    keyLength,
  });
}
