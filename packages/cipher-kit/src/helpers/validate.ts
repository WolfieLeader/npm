import { $err, $isIntIn, $isPlainObj, $isStr, $isWellFormedStr, $ok, textEncoder } from "@internal/helpers";
import type { ErrResult, Result } from "@internal/helpers";
import {
  CIPHER_ENCODING,
  DIGEST_ALGORITHMS,
  ENCODING,
  ENCRYPTION_ALGORITHMS,
  MAX_ADDITIONAL_DATA_BYTES,
  MAX_HKDF_INFO_BYTES,
  MAX_PBKDF2_ITERATIONS,
  MAX_PBKDF2_KEY_LENGTH,
  MAX_PBKDF2_SALT_LENGTH,
} from "./consts.js";
import type {
  CipherEncoding,
  CreateSecretKeyOptions,
  DigestAlgorithm,
  Encoding,
  EncryptionAlgorithm,
  HashOptions,
  HashPasswordOptions,
  ValidatedHashOptions,
  ValidatedKdfOptions,
  ValidatedVerifyOptions,
  VerifyPasswordOptions,
} from "./types.js";

export function $isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

/** Own-property check, so inherited names such as `"constructor"` or `"__proto__"` are rejected. */
function $isDigestAlgorithm(x: unknown): x is DigestAlgorithm {
  return typeof x === "string" && Object.hasOwn(DIGEST_ALGORITHMS, x);
}

/** Own-property check, so inherited names such as `"constructor"` or `"__proto__"` are rejected. */
function $isEncryptionAlgorithm(x: unknown): x is EncryptionAlgorithm {
  return typeof x === "string" && Object.hasOwn(ENCRYPTION_ALGORITHMS, x);
}

export function $isCipherEncoding(x: unknown): x is CipherEncoding {
  return (CIPHER_ENCODING as readonly unknown[]).includes(x);
}

export function $isEncoding(x: unknown): x is Encoding {
  return (ENCODING as readonly unknown[]).includes(x);
}

const DIGEST_HINT = `Supported digests are: ${Object.keys(DIGEST_ALGORITHMS).join(", ")}`;
const ALGORITHM_HINT = `Supported algorithms are: ${Object.keys(ENCRYPTION_ALGORITHMS).join(", ")}`;

// Error helpers never echo the rejected value: it may be a misplaced secret, and a Symbol would throw.
function $digestErr(ctx: string): ErrResult {
  return $err({ message: `${ctx}: Unsupported digest`, description: DIGEST_HINT });
}

export function $cipherEncodingErr(ctx: string, kind: "input" | "output"): ErrResult {
  return $err({ message: `${ctx}: Unsupported ${kind} encoding`, description: "Use base64, base64url, or hex" });
}

export function $encodingErr(ctx: string): ErrResult {
  return $err({ message: `${ctx}: Unsupported encoding`, description: "Use base64, base64url, hex, utf8, or latin1" });
}

const expectedKeys = new Set(["platform", "digest", "algorithm", "key", "injected"]);

function $hasExactKeys(x: Record<string, unknown>): boolean {
  const keys = Object.keys(x);
  return keys.length === expectedKeys.size && keys.every((key) => expectedKeys.has(key));
}

function $matchesAlgorithm(injected: unknown, algorithm: (typeof ENCRYPTION_ALGORITHMS)[EncryptionAlgorithm]): boolean {
  if (!$isObj(injected)) return false;
  return (
    injected["keyBytes"] === algorithm.keyBytes &&
    injected["node"] === algorithm.node &&
    injected["web"] === algorithm.web
  );
}

export function $validateSecretKeyBase(
  x: unknown,
  platform: "node" | "web",
): {
  obj: Record<string, unknown>;
  algorithm: (typeof ENCRYPTION_ALGORITHMS)[keyof typeof ENCRYPTION_ALGORITHMS];
} | null {
  if (!$isObj(x) || x["platform"] !== platform || !$hasExactKeys(x)) return null;
  if (!$isDigestAlgorithm(x["digest"]) || !$isEncryptionAlgorithm(x["algorithm"])) return null;
  if (!$isObj(x["key"]) || x["key"]["type"] !== "secret") return null;

  const algorithm = ENCRYPTION_ALGORITHMS[x["algorithm"]];
  if (!$matchesAlgorithm(x["injected"], algorithm)) return null;
  return { obj: x, algorithm };
}

/**
 * Resolves the `additionalData` option to a private copy of its bytes.
 * Omitted and empty both resolve to `undefined`, because AES-GCM authenticates them identically.
 */
export function $resolveAdditionalData(
  value: unknown,
  ctx: string,
): Result<{ aad: Uint8Array<ArrayBuffer> | undefined }> {
  if (value === undefined) return $ok({ aad: undefined });
  const tooLong = $err({
    message: `${ctx}: Additional data must be at most ${MAX_ADDITIONAL_DATA_BYTES} bytes`,
    description: `Strings are measured in UTF-8 bytes; use at most ${MAX_ADDITIONAL_DATA_BYTES}`,
  });
  let bytes: Uint8Array<ArrayBuffer>;
  if ($isWellFormedStr(value)) {
    if (value.length > MAX_ADDITIONAL_DATA_BYTES) return tooLong;
    bytes = textEncoder.encode(value);
  } else if (value instanceof Uint8Array) {
    if (value.byteLength > MAX_ADDITIONAL_DATA_BYTES) return tooLong;
    bytes = new Uint8Array(value);
  } else {
    return $err({
      message: `${ctx}: Additional data must be a string or Uint8Array`,
      description: "Received another type, or a string with lone UTF-16 surrogates",
    });
  }
  if (bytes.byteLength > MAX_ADDITIONAL_DATA_BYTES) return tooLong;
  return $ok({ aad: bytes.byteLength === 0 ? undefined : bytes });
}

/** Matches the `"iv.cipher.tag."` encrypted payload format. */
export const ENCRYPTED_REGEX: RegExp =
  /^([A-Za-z0-9+/_-][A-Za-z0-9+/=_-]*)\.([A-Za-z0-9+/_-][A-Za-z0-9+/=_-]*)\.([A-Za-z0-9+/_-][A-Za-z0-9+/=_-]*)\.$/;

/**
 * Structural check only — validates the dot-separated `"iv.cipher.tag."` format
 * but does NOT verify that individual segments contain valid base64, base64url, or hex encoding.
 */
export function matchEncryptedPattern(data: string): boolean {
  return typeof data === "string" && ENCRYPTED_REGEX.test(data);
}

/** Validates `data` and `options` for `hash()`. Any well-formed string is accepted, including `""`. */
export function $validateHashOptions(
  data: string,
  options: HashOptions,
  prefix: string,
): Result<{ digestAlgo: (typeof DIGEST_ALGORITHMS)[DigestAlgorithm]; outputEncoding: CipherEncoding }> {
  if (!$isWellFormedStr(data)) {
    return $err({
      message: `${prefix} hash: Data must be a well-formed string`,
      description: "Received a non-string value or a string with lone UTF-16 surrogates",
    });
  }
  if (!$isPlainObj<HashOptions>(options)) {
    return $err({
      message: `${prefix} hash: Options must be a plain object`,
      description: 'Pass an object like { digest: "sha256" }',
    });
  }
  const outputEncoding = options.outputEncoding ?? "base64url";
  if (!$isCipherEncoding(outputEncoding)) return $cipherEncodingErr(`${prefix} hash`, "output");
  const digest = options.digest ?? "sha256";
  if (!$isDigestAlgorithm(digest)) return $digestErr(`${prefix} hash`);
  return $ok({ digestAlgo: DIGEST_ALGORITHMS[digest], outputEncoding });
}

function $resolveKdfStrings(
  secret: string,
  options: CreateSecretKeyOptions,
  ctx: string,
): Result<{ salt: string; info: string }> {
  if (!$isStr(secret, 8) || !$isWellFormedStr(secret)) {
    return $err({
      message: `${ctx}: Secret must be at least 8 characters`,
      description: "Use a high-entropy, well-formed string of at least 8 non-whitespace characters",
    });
  }
  const salt = options.salt ?? "cipher-kit";
  if (!$isStr(salt, 8) || !$isWellFormedStr(salt)) {
    return $err({
      message: `${ctx}: Salt must be at least 8 characters`,
      description: "Provide a well-formed salt string with at least 8 non-whitespace characters",
    });
  }
  const info = options.info ?? "cipher-kit";
  if (!$isStr(info) || !$isWellFormedStr(info)) {
    return $err({
      message: `${ctx}: Info must be a non-empty string`,
      description: "Received an empty, non-string, or not well-formed value",
    });
  }
  // HKDF caps info at 1024 bytes in Node; check upfront so both platforms fail the same way.
  if (textEncoder.encode(info.normalize("NFKC")).byteLength > MAX_HKDF_INFO_BYTES) {
    return $err({
      message: `${ctx}: Info must be at most ${MAX_HKDF_INFO_BYTES} bytes`,
      description: `Info is measured in UTF-8 bytes after NFKC normalization; use at most ${MAX_HKDF_INFO_BYTES}`,
    });
  }
  return $ok({ salt, info });
}

export function $validateCreateSecretKeyOptions(
  secret: string,
  options: CreateSecretKeyOptions,
  prefix: string,
): Result<ValidatedKdfOptions> {
  const ctx = `${prefix} createSecretKey`;
  if (!$isPlainObj<CreateSecretKeyOptions>(options)) {
    return $err({
      message: `${ctx}: Options must be a plain object`,
      description: 'Pass an object like { algorithm: "aes256gcm" }',
    });
  }
  const strings = $resolveKdfStrings(secret, options, ctx);
  if (strings.error) return $err(strings.error);

  const algorithm = options.algorithm ?? "aes256gcm";
  if (!$isEncryptionAlgorithm(algorithm)) {
    return $err({ message: `${ctx}: Unsupported algorithm`, description: ALGORITHM_HINT });
  }
  const digest = options.digest ?? "sha256";
  if (!$isDigestAlgorithm(digest)) return $digestErr(ctx);

  return $ok({
    algorithm,
    digest,
    salt: strings.salt,
    info: strings.info,
    encryptAlgo: ENCRYPTION_ALGORITHMS[algorithm],
    digestAlgo: DIGEST_ALGORITHMS[digest],
  });
}

function $checkPassword(password: string, ctx: string): Result<{ ok: true }> {
  if (!$isStr(password) || !$isWellFormedStr(password)) {
    return $err({
      message: `${ctx}: Password must be a non-empty string`,
      description: "Received an empty, non-string, or not well-formed value",
    });
  }
  return $ok({ ok: true });
}

/** Resolves the PBKDF2 options shared by hashPassword and verifyPassword. */
function $resolvePbkdf2(
  options: HashPasswordOptions | VerifyPasswordOptions,
  ctx: string,
): Result<{ digest: DigestAlgorithm; iterations: number; keyLength: number }> {
  const digest = options.digest ?? "sha512";
  if (!$isDigestAlgorithm(digest)) return $digestErr(ctx);

  const iterations = options.iterations ?? 320_000;
  if (!$isIntIn(iterations, 100_000, MAX_PBKDF2_ITERATIONS)) {
    return $err({
      message: `${ctx}: Iterations must be at least 100,000`,
      description: `Must be an integer between 100,000 and ${MAX_PBKDF2_ITERATIONS} (recommended 320,000 or more)`,
    });
  }

  const keyLength = options.keyLength ?? 64;
  if (!$isIntIn(keyLength, 16, MAX_PBKDF2_KEY_LENGTH)) {
    return $err({
      message: `${ctx}: Key length must be at least 16 bytes`,
      description: `Must be an integer between 16 and ${MAX_PBKDF2_KEY_LENGTH} (recommended 64 or more)`,
    });
  }
  return $ok({ digest, iterations, keyLength });
}

export function $validateHashPasswordOptions(
  password: string,
  options: HashPasswordOptions,
  prefix: string,
): Result<ValidatedHashOptions> {
  const ctx = `${prefix} hashPassword`;
  const pw = $checkPassword(password, ctx);
  if (pw.error) return $err(pw.error);
  if (!$isPlainObj<HashPasswordOptions>(options)) {
    return $err({
      message: `${ctx}: Options must be a plain object`,
      description: "Pass an object like { iterations: 320000 }",
    });
  }

  const common = $resolvePbkdf2(options, ctx);
  if (common.error) return $err(common.error);

  const outputEncoding = options.outputEncoding ?? "base64url";
  if (!$isCipherEncoding(outputEncoding)) return $cipherEncodingErr(ctx, "output");

  const saltLength = options.saltLength ?? 16;
  if (!$isIntIn(saltLength, 8, MAX_PBKDF2_SALT_LENGTH)) {
    return $err({
      message: `${ctx}: Salt length must be at least 8 bytes`,
      description: `Must be an integer between 8 and ${MAX_PBKDF2_SALT_LENGTH} (recommended 16 or more)`,
    });
  }

  const { digest, iterations, keyLength } = common;
  return $ok({ digest, digestAlgo: DIGEST_ALGORITHMS[digest], outputEncoding, saltLength, iterations, keyLength });
}

function $maxEncodedLength(byteLength: number, encoding: CipherEncoding): number {
  if (encoding === "hex") return byteLength * 2;
  return Math.ceil(byteLength / 3) * 4;
}

function $checkStoredHash(hashedPassword: string, salt: string, ctx: string): Result<{ ok: true }> {
  if (!$isStr(hashedPassword)) {
    return $err({
      message: `${ctx}: Hashed password must be a non-empty string`,
      description: "Pass the hash string returned by hashPassword()",
    });
  }
  if (!$isStr(salt)) {
    return $err({
      message: `${ctx}: Salt must be a non-empty string`,
      description: "Pass the salt string returned by hashPassword()",
    });
  }
  return $ok({ ok: true });
}

function $checkEncodedLengths(
  stored: { hashedPassword: string; salt: string },
  validated: { keyLength: number; inputEncoding: CipherEncoding },
  ctx: string,
): Result<{ ok: true }> {
  const { keyLength, inputEncoding } = validated;
  const maxHashLen = $maxEncodedLength(keyLength, inputEncoding);
  if (stored.hashedPassword.length > maxHashLen) {
    return $err({
      message: `${ctx}: Hashed password exceeds maximum encoded length`,
      description: `Expected at most ${maxHashLen} characters for ${keyLength}-byte key with ${inputEncoding} encoding`,
    });
  }
  const maxSaltLen = $maxEncodedLength(MAX_PBKDF2_SALT_LENGTH, inputEncoding);
  if (stored.salt.length > maxSaltLen) {
    return $err({
      message: `${ctx}: Salt exceeds maximum encoded length`,
      description: `Expected at most ${maxSaltLen} characters for ${inputEncoding} encoding`,
    });
  }
  return $ok({ ok: true });
}

/** Stored values passed to verifyPassword, grouped to keep the validator at three parameters. */
export interface VerifyPasswordInput {
  password: string;
  hashedPassword: string;
  salt: string;
}

export function $validateVerifyPasswordOptions(
  input: VerifyPasswordInput,
  options: VerifyPasswordOptions,
  prefix: string,
): Result<ValidatedVerifyOptions> {
  const ctx = `${prefix} verifyPassword`;
  const pw = $checkPassword(input.password, ctx);
  if (pw.error) return $err(pw.error);
  const stored = $checkStoredHash(input.hashedPassword, input.salt, ctx);
  if (stored.error) return $err(stored.error);
  if (!$isPlainObj<VerifyPasswordOptions>(options)) {
    return $err({
      message: `${ctx}: Options must be a plain object`,
      description: "Pass an object matching the options used for hashPassword()",
    });
  }

  const common = $resolvePbkdf2(options, ctx);
  if (common.error) return $err(common.error);

  const inputEncoding = options.inputEncoding ?? "base64url";
  if (!$isCipherEncoding(inputEncoding)) return $cipherEncodingErr(ctx, "input");

  const { digest, iterations, keyLength } = common;
  const lengths = $checkEncodedLengths(input, { keyLength, inputEncoding }, ctx);
  if (lengths.error) return $err(lengths.error);

  return $ok({ digest, digestAlgo: DIGEST_ALGORITHMS[digest], inputEncoding, iterations, keyLength });
}
