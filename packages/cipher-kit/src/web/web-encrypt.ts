import {
  $err,
  $fmtError,
  $fmtResultErr,
  $isPlainObj,
  $isStr,
  $ok,
  $parseToObj,
  $stringifyObj,
  type Result,
} from "@internal/helpers";
import {
  CIPHER_ENCODING,
  DIGEST_ALGORITHMS,
  type ENCRYPTION_ALGORITHMS,
  GCM_IV_LENGTH,
  GCM_TAG_BYTES,
} from "~/helpers/consts.js";
import type {
  CreateSecretKeyOptions,
  DecryptOptions,
  EncryptOptions,
  HashOptions,
  HashPasswordOptions,
  VerifyPasswordOptions,
} from "~/helpers/types.js";
import {
  $isObj,
  $validateCreateSecretKeyOptions,
  $validateHashPasswordOptions,
  $validateSecretKeyBase,
  $validateVerifyPasswordOptions,
  matchEncryptedPattern,
} from "~/helpers/validate.js";
import { $convertBytesToStr, $convertStrToBytes, textEncoder } from "./web-encode.js";

declare const __brand: unique symbol;

export type WebSecretKey = {
  readonly platform: "web";
  readonly digest: keyof typeof DIGEST_ALGORITHMS;
  readonly algorithm: keyof typeof ENCRYPTION_ALGORITHMS;
  readonly key: CryptoKey;
  readonly injected: (typeof ENCRYPTION_ALGORITHMS)[keyof typeof ENCRYPTION_ALGORITHMS];
} & { readonly [__brand]: "secretKey-web" };

export function $isWebSecretKey(x: unknown): WebSecretKey | null {
  const base = $validateSecretKeyBase(x, "web");
  if (!base) return null;

  if (typeof globalThis.CryptoKey === "undefined" || !(base.obj.key instanceof CryptoKey)) return null;

  if (
    !$isObj(base.obj.key.algorithm) ||
    base.obj.key.algorithm.name !== base.algorithm.web ||
    (typeof base.obj.key.algorithm.length === "number" &&
      base.obj.key.algorithm.length !== base.algorithm.keyBytes * 8) ||
    !Array.isArray(base.obj.key.usages) ||
    !(base.obj.key.usages.includes("encrypt") && base.obj.key.usages.includes("decrypt"))
  ) {
    return null;
  }
  return x as WebSecretKey;
}

export function $generateUuid(): Result<string> {
  try {
    return $ok(globalThis.crypto.randomUUID());
  } catch (error) {
    return $err({ message: "web generateUuid: Failed to generate UUID", description: $fmtError(error) });
  }
}

export async function $createSecretKey(
  secret: string,
  options: CreateSecretKeyOptions,
): Promise<Result<{ result: WebSecretKey }>> {
  const validated = $validateCreateSecretKeyOptions(secret, options, "web");
  if (validated.error) return $err(validated.error);

  const { algorithm, digest, salt, info, encryptAlgo, digestAlgo } = validated;

  try {
    const ikm = await globalThis.crypto.subtle.importKey(
      "raw",
      textEncoder.encode(secret.normalize("NFKC")),
      "HKDF",
      false,
      ["deriveKey"],
    );
    const extractable = options.extractable ?? false;
    const key = await globalThis.crypto.subtle.deriveKey(
      {
        name: "HKDF",
        hash: digestAlgo.web,
        salt: textEncoder.encode(salt.normalize("NFKC")),
        info: textEncoder.encode(info.normalize("NFKC")),
      },
      ikm,
      { name: encryptAlgo.web, length: encryptAlgo.keyBytes * 8 },
      extractable,
      ["encrypt", "decrypt"],
    );
    const secretKey = Object.freeze({ platform: "web", digest, algorithm, key, injected: encryptAlgo }) as WebSecretKey;

    return $ok({ result: secretKey });
  } catch (error) {
    return $err({
      message: "web createSecretKey: Failed to derive key",
      description: $fmtError(error),
    });
  }
}

export async function $encrypt(
  data: string,
  secretKey: WebSecretKey,
  options: EncryptOptions,
): Promise<Result<string>> {
  if (!$isStr(data)) {
    return $err({
      message: "web encrypt: Data must be a non-empty string",
      description: "Received empty or non-string value",
    });
  }

  if (!$isPlainObj<EncryptOptions>(options)) {
    return $err({
      message: "web encrypt: Options must be a plain object",
      description: 'Pass an object like { outputEncoding: "base64url" }',
    });
  }

  const outputEncoding = options.outputEncoding ?? "base64url";
  if (!CIPHER_ENCODING.includes(outputEncoding)) {
    return $err({
      message: `web encrypt: Unsupported output encoding: ${outputEncoding}`,
      description: "Use base64, base64url, or hex",
    });
  }

  const injectedKey = $isWebSecretKey(secretKey);
  if (!injectedKey) {
    return $err({
      message: "web encrypt: Invalid secret key",
      description: "Expected a WebSecretKey created by webKit.createSecretKey()",
    });
  }

  const { result, error } = $convertStrToBytes(data, "utf8");
  if (error) return $err(error);

  try {
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(GCM_IV_LENGTH));
    const cipherWithTag = await globalThis.crypto.subtle.encrypt(
      { name: injectedKey.injected.web, iv },
      injectedKey.key,
      result,
    );

    const cipherOnly = cipherWithTag.slice(0, cipherWithTag.byteLength - GCM_TAG_BYTES);
    const tag = cipherWithTag.slice(cipherWithTag.byteLength - GCM_TAG_BYTES);

    const ivStr = $convertBytesToStr(iv, outputEncoding);
    const cipherStr = $convertBytesToStr(cipherOnly, outputEncoding);
    const tagStr = $convertBytesToStr(tag, outputEncoding);

    if (ivStr.error || cipherStr.error || tagStr.error) {
      return $err({
        message: "web encrypt: Failed to encode output",
        description: `Conversion error: ${$fmtResultErr(ivStr.error || cipherStr.error || tagStr.error)}`,
      });
    }

    return $ok(`${ivStr.result}.${cipherStr.result}.${tagStr.result}.`);
  } catch (error) {
    return $err({ message: "web encrypt: Failed to encrypt data", description: $fmtError(error) });
  } finally {
    result.fill(0);
  }
}

export async function $decrypt(
  encrypted: string,
  secretKey: WebSecretKey,
  options: DecryptOptions,
): Promise<Result<string>> {
  if (!matchEncryptedPattern(encrypted)) {
    return $err({
      message: "web decrypt: Invalid encrypted data format",
      description: 'Encrypted data must be in the format "iv.cipher.tag."',
    });
  }

  if (!$isPlainObj<DecryptOptions>(options)) {
    return $err({
      message: "web decrypt: Options must be a plain object",
      description: 'Pass an object like { inputEncoding: "base64url" }',
    });
  }

  const inputEncoding = options.inputEncoding ?? "base64url";
  if (!CIPHER_ENCODING.includes(inputEncoding)) {
    return $err({
      message: `web decrypt: Unsupported input encoding: ${inputEncoding}`,
      description: "Use base64, base64url, or hex",
    });
  }

  const [iv, cipher, tag] = encrypted.split(".", 4) as [string, string, string];

  const injectedKey = $isWebSecretKey(secretKey);
  if (!injectedKey) {
    return $err({
      message: "web decrypt: Invalid secret key",
      description: "Expected a WebSecretKey created by webKit.createSecretKey()",
    });
  }

  const ivBytes = $convertStrToBytes(iv, inputEncoding);
  const cipherBytes = $convertStrToBytes(cipher, inputEncoding);
  const tagBytes = $convertStrToBytes(tag, inputEncoding);

  if (ivBytes.error || cipherBytes.error || tagBytes.error) {
    return $err({
      message: "web decrypt: Failed to decode input",
      description: `Conversion error: ${$fmtResultErr(ivBytes.error || cipherBytes.error || tagBytes.error)}`,
    });
  }

  if (ivBytes.result.byteLength !== GCM_IV_LENGTH) {
    return $err({
      message: "web decrypt: Invalid IV length",
      description: `Expected ${GCM_IV_LENGTH} bytes, got ${ivBytes.result.byteLength}`,
    });
  }

  if (tagBytes.result.byteLength !== GCM_TAG_BYTES) {
    return $err({
      message: "web decrypt: Invalid auth tag length",
      description: `Expected ${GCM_TAG_BYTES} bytes, got ${tagBytes.result.byteLength}`,
    });
  }

  const cipherWithTag = new Uint8Array(cipherBytes.result.byteLength + tagBytes.result.byteLength);
  cipherWithTag.set(new Uint8Array(cipherBytes.result), 0);
  cipherWithTag.set(new Uint8Array(tagBytes.result), cipherBytes.result.byteLength);

  let decrypted: Uint8Array | undefined;
  try {
    decrypted = new Uint8Array(
      await globalThis.crypto.subtle.decrypt(
        { name: injectedKey.injected.web, iv: ivBytes.result },
        injectedKey.key,
        cipherWithTag,
      ),
    );

    return $convertBytesToStr(decrypted, "utf8");
  } catch (error) {
    return $err({ message: "web decrypt: Failed to decrypt data", description: $fmtError(error) });
  } finally {
    decrypted?.fill(0);
  }
}

export async function $encryptObj<T extends object = Record<string, unknown>>(
  data: T,
  secretKey: WebSecretKey,
  options: EncryptOptions,
): Promise<Result<string>> {
  const { result, error } = $stringifyObj(data);
  if (error) return $err(error);
  return await $encrypt(result, secretKey, options);
}

export async function $decryptObj<T extends object = Record<string, unknown>>(
  encrypted: string,
  secretKey: WebSecretKey,
  options: DecryptOptions,
): Promise<Result<{ result: T }>> {
  const { result, error } = await $decrypt(encrypted, secretKey, options);
  if (error) return $err(error);
  return $parseToObj<T>(result);
}

export async function $hash(data: string, options: HashOptions = {}): Promise<Result<string>> {
  if (!$isStr(data)) {
    return $err({
      message: "web hash: Data must be a non-empty string",
      description: "Received empty or non-string value",
    });
  }

  if (!$isPlainObj<HashOptions>(options)) {
    return $err({
      message: "web hash: Options must be a plain object",
      description: 'Pass an object like { digest: "sha256" }',
    });
  }

  const outputEncoding = options.outputEncoding ?? "base64url";
  if (!CIPHER_ENCODING.includes(outputEncoding)) {
    return $err({
      message: `web hash: Unsupported output encoding: ${outputEncoding}`,
      description: "Use base64, base64url, or hex",
    });
  }

  const digest = options.digest ?? "sha256";
  if (!(digest in DIGEST_ALGORITHMS)) {
    return $err({
      message: `web hash: Unsupported digest: ${digest}`,
      description: `Supported digests are: ${Object.keys(DIGEST_ALGORITHMS).join(", ")}`,
    });
  }
  const digestAlgo = DIGEST_ALGORITHMS[digest];

  const { result, error } = $convertStrToBytes(data, "utf8");
  if (error) return $err(error);

  try {
    const hashed = await globalThis.crypto.subtle.digest(digestAlgo.web, result);
    return $convertBytesToStr(hashed, outputEncoding);
  } catch (error) {
    return $err({ message: "web hash: Failed to hash data", description: $fmtError(error) });
  }
}

export async function $hashPassword(
  password: string,
  options: HashPasswordOptions,
): Promise<Result<{ result: string; salt: string }>> {
  const validated = $validateHashPasswordOptions(password, options, "web");
  if (validated.error) return $err(validated.error);

  const { digestAlgo, outputEncoding, saltLength, iterations, keyLength } = validated;

  const salt = globalThis.crypto.getRandomValues(new Uint8Array(saltLength));
  let bits: ArrayBuffer | undefined;
  try {
    const baseKey = await globalThis.crypto.subtle.importKey(
      "raw",
      textEncoder.encode(password.normalize("NFKC")),
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    bits = await globalThis.crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations, hash: digestAlgo.web },
      baseKey,
      keyLength * 8,
    );

    const saltStr = $convertBytesToStr(salt, outputEncoding);
    if (saltStr.error) return $err(saltStr.error);

    const hashedPasswordStr = $convertBytesToStr(bits, outputEncoding);
    if (hashedPasswordStr.error) return $err(hashedPasswordStr.error);

    return $ok({ result: hashedPasswordStr.result, salt: saltStr.result });
  } catch (error) {
    return $err({ message: "web hashPassword: Failed to hash password", description: $fmtError(error) });
  } finally {
    salt.fill(0);
    if (bits) new Uint8Array(bits).fill(0);
  }
}

export async function $verifyPassword(
  password: string,
  hashedPassword: string,
  salt: string,
  options: VerifyPasswordOptions,
): Promise<Result<boolean>> {
  const validated = $validateVerifyPasswordOptions(password, hashedPassword, salt, options, "web");
  if (validated.error) return $err(validated.error);

  const { digestAlgo, inputEncoding, iterations, keyLength } = validated;

  const saltBytes = $convertStrToBytes(salt, inputEncoding);
  if (saltBytes.error) return $err(saltBytes.error);

  const hashedPasswordBytes = $convertStrToBytes(hashedPassword, inputEncoding);
  if (hashedPasswordBytes.error) return $err(hashedPasswordBytes.error);

  if (hashedPasswordBytes.result.byteLength !== keyLength) return $ok(false);

  try {
    const baseKey = await globalThis.crypto.subtle.importKey(
      "raw",
      textEncoder.encode(password.normalize("NFKC")),
      "PBKDF2",
      false,
      ["deriveBits"],
    );

    const bits = new Uint8Array(
      await globalThis.crypto.subtle.deriveBits(
        { name: "PBKDF2", salt: saltBytes.result, iterations, hash: digestAlgo.web },
        baseKey,
        keyLength * 8,
      ),
    );

    const expected = hashedPasswordBytes.result;
    const left = new Uint8Array(keyLength);
    const right = new Uint8Array(keyLength);
    left.set(bits);
    right.set(expected);

    let diff = 0;
    for (let i = 0; i < keyLength; i++) {
      diff |= (left[i] as number) ^ (right[i] as number);
    }
    try {
      return $ok(diff === 0);
    } finally {
      left.fill(0);
      right.fill(0);
      bits.fill(0);
    }
  } catch (error) {
    return $err({ message: "web verifyPassword: Verification failed", description: $fmtError(error) });
  } finally {
    saltBytes.result?.fill(0);
    hashedPasswordBytes.result?.fill(0);
  }
}
