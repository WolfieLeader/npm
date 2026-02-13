import { Buffer } from "node:buffer";
import nodeCrypto from "node:crypto";
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
  $validateCreateSecretKeyOptions,
  $validateHashPasswordOptions,
  $validateSecretKeyBase,
  $validateVerifyPasswordOptions,
  matchEncryptedPattern,
} from "~/helpers/validate.js";
import { $convertBytesToStr, $convertStrToBytes } from "./node-encode.js";

declare const __brand: unique symbol;

export type NodeSecretKey = {
  readonly platform: "node";
  readonly digest: keyof typeof DIGEST_ALGORITHMS;
  readonly algorithm: keyof typeof ENCRYPTION_ALGORITHMS;
  readonly key: nodeCrypto.KeyObject;
  readonly injected: (typeof ENCRYPTION_ALGORITHMS)[keyof typeof ENCRYPTION_ALGORITHMS];
} & { readonly [__brand]: "secretKey-node" };

export function $isNodeSecretKey(x: unknown): NodeSecretKey | null {
  const base = $validateSecretKeyBase(x, "node");
  if (!base) return null;

  if (
    !(base.obj.key instanceof nodeCrypto.KeyObject) ||
    (typeof base.obj.key.symmetricKeySize === "number" && base.obj.key.symmetricKeySize !== base.algorithm.keyBytes)
  ) {
    return null;
  }
  return x as NodeSecretKey;
}

export function $generateUuid(): Result<string> {
  try {
    return $ok(nodeCrypto.randomUUID());
  } catch (error) {
    return $err({ message: "node generateUuid: Failed to generate UUID", description: $fmtError(error) });
  }
}

export function $createSecretKey(secret: string, options: CreateSecretKeyOptions): Result<{ result: NodeSecretKey }> {
  const validated = $validateCreateSecretKeyOptions(secret, options, "node");
  if (validated.error) return $err(validated.error);

  const { algorithm, digest, salt, info, encryptAlgo, digestAlgo } = validated;

  try {
    const derivedKey = Buffer.from(
      nodeCrypto.hkdfSync(
        digestAlgo.node,
        secret.normalize("NFKC"),
        salt.normalize("NFKC"),
        info.normalize("NFKC"),
        encryptAlgo.keyBytes,
      ),
    );
    try {
      const key = nodeCrypto.createSecretKey(derivedKey);
      const secretKey = Object.freeze({
        platform: "node",
        digest,
        algorithm,
        key,
        injected: encryptAlgo,
      }) as NodeSecretKey;

      return $ok({ result: secretKey });
    } finally {
      derivedKey.fill(0);
    }
  } catch (error) {
    return $err({ message: "node createSecretKey: Failed to derive key", description: $fmtError(error) });
  }
}

export function $encrypt(data: string, secretKey: NodeSecretKey, options: EncryptOptions): Result<string> {
  if (!$isStr(data)) {
    return $err({
      message: "node encrypt: Data must be a non-empty string",
      description: "Received empty or non-string value",
    });
  }

  if (!$isPlainObj<EncryptOptions>(options)) {
    return $err({
      message: "node encrypt: Options must be a plain object",
      description: 'Pass an object like { outputEncoding: "base64url" }',
    });
  }

  const outputEncoding = options.outputEncoding ?? "base64url";
  if (!CIPHER_ENCODING.includes(outputEncoding)) {
    return $err({
      message: `node encrypt: Unsupported output encoding: ${outputEncoding}`,
      description: "Use base64, base64url, or hex",
    });
  }

  const injectedKey = $isNodeSecretKey(secretKey);
  if (!injectedKey) {
    return $err({
      message: "node encrypt: Invalid secret key",
      description: "Expected a NodeSecretKey created by nodeKit.createSecretKey()",
    });
  }

  const { result, error } = $convertStrToBytes(data, "utf8");
  if (error) return $err(error);

  try {
    const iv = nodeCrypto.randomBytes(GCM_IV_LENGTH);
    const cipher = nodeCrypto.createCipheriv(injectedKey.injected.node, injectedKey.key, iv);
    const encrypted = Buffer.concat([cipher.update(result), cipher.final()]);
    const tag = cipher.getAuthTag();

    const ivStr = $convertBytesToStr(iv, outputEncoding);
    const cipherStr = $convertBytesToStr(encrypted, outputEncoding);
    const tagStr = $convertBytesToStr(tag, outputEncoding);

    if (ivStr.error || cipherStr.error || tagStr.error) {
      return $err({
        message: "node encrypt: Failed to encode output",
        description: `Conversion error: ${$fmtResultErr(ivStr.error || cipherStr.error || tagStr.error)}`,
      });
    }

    return $ok(`${ivStr.result}.${cipherStr.result}.${tagStr.result}.`);
  } catch (error) {
    return $err({ message: "node encrypt: Failed to encrypt data", description: $fmtError(error) });
  } finally {
    result.fill(0);
  }
}

export function $decrypt(encrypted: string, secretKey: NodeSecretKey, options: DecryptOptions): Result<string> {
  if (!matchEncryptedPattern(encrypted)) {
    return $err({
      message: "node decrypt: Invalid encrypted data format",
      description: 'Encrypted data must be in the format "iv.cipher.tag."',
    });
  }

  if (!$isPlainObj<DecryptOptions>(options)) {
    return $err({
      message: "node decrypt: Options must be a plain object",
      description: 'Pass an object like { inputEncoding: "base64url" }',
    });
  }

  const inputEncoding = options.inputEncoding ?? "base64url";
  if (!CIPHER_ENCODING.includes(inputEncoding)) {
    return $err({
      message: `node decrypt: Unsupported input encoding: ${inputEncoding}`,
      description: "Use base64, base64url, or hex",
    });
  }

  const [iv, cipher, tag] = encrypted.split(".", 4) as [string, string, string];

  const injectedKey = $isNodeSecretKey(secretKey);
  if (!injectedKey) {
    return $err({
      message: "node decrypt: Invalid secret key",
      description: "Expected a NodeSecretKey created by nodeKit.createSecretKey()",
    });
  }

  const ivBytes = $convertStrToBytes(iv, inputEncoding);
  const cipherBytes = $convertStrToBytes(cipher, inputEncoding);
  const tagBytes = $convertStrToBytes(tag, inputEncoding);

  if (ivBytes.error || cipherBytes.error || tagBytes.error) {
    return $err({
      message: "node decrypt: Failed to decode input",
      description: `Conversion error: ${$fmtResultErr(ivBytes.error || cipherBytes.error || tagBytes.error)}`,
    });
  }

  if (ivBytes.result.byteLength !== GCM_IV_LENGTH) {
    return $err({
      message: "node decrypt: Invalid IV length",
      description: `Expected ${GCM_IV_LENGTH} bytes, got ${ivBytes.result.byteLength}`,
    });
  }

  if (tagBytes.result.byteLength !== GCM_TAG_BYTES) {
    return $err({
      message: "node decrypt: Invalid auth tag length",
      description: `Expected ${GCM_TAG_BYTES} bytes, got ${tagBytes.result.byteLength}`,
    });
  }

  let decrypted: Buffer | undefined;
  try {
    const decipher = nodeCrypto.createDecipheriv(injectedKey.injected.node, injectedKey.key, ivBytes.result);
    decipher.setAuthTag(tagBytes.result);
    decrypted = Buffer.concat([decipher.update(cipherBytes.result), decipher.final()]);

    return $convertBytesToStr(decrypted, "utf8");
  } catch (error) {
    return $err({ message: "node decrypt: Failed to decrypt data", description: $fmtError(error) });
  } finally {
    decrypted?.fill(0);
  }
}

export function $encryptObj<T extends object = Record<string, unknown>>(
  data: T,
  secretKey: NodeSecretKey,
  options: EncryptOptions,
): Result<string> {
  const { result, error } = $stringifyObj(data);
  if (error) return $err(error);
  return $encrypt(result, secretKey, options);
}

export function $decryptObj<T extends object = Record<string, unknown>>(
  encrypted: string,
  secretKey: NodeSecretKey,
  options: DecryptOptions,
): Result<{ result: T }> {
  const { result, error } = $decrypt(encrypted, secretKey, options);
  if (error) return $err(error);
  return $parseToObj<T>(result);
}

export function $hash(data: string, options: HashOptions = {}): Result<string> {
  if (!$isStr(data)) {
    return $err({
      message: "node hash: Data must be a non-empty string",
      description: "Received empty or non-string value",
    });
  }

  if (!$isPlainObj<HashOptions>(options)) {
    return $err({
      message: "node hash: Options must be a plain object",
      description: 'Pass an object like { digest: "sha256" }',
    });
  }

  const outputEncoding = options.outputEncoding ?? "base64url";
  if (!CIPHER_ENCODING.includes(outputEncoding)) {
    return $err({
      message: `node hash: Unsupported output encoding: ${outputEncoding}`,
      description: "Use base64, base64url, or hex",
    });
  }

  const digest = options.digest ?? "sha256";
  if (!(digest in DIGEST_ALGORITHMS)) {
    return $err({
      message: `node hash: Unsupported digest: ${digest}`,
      description: `Supported digests are: ${Object.keys(DIGEST_ALGORITHMS).join(", ")}`,
    });
  }
  const digestAlgo = DIGEST_ALGORITHMS[digest];

  const { result, error } = $convertStrToBytes(data, "utf8");
  if (error) return $err(error);

  try {
    const hashed = nodeCrypto.createHash(digestAlgo.node).update(result).digest();
    return $convertBytesToStr(hashed, outputEncoding);
  } catch (error) {
    return $err({ message: "node hash: Failed to hash data", description: $fmtError(error) });
  }
}

export function $hashPassword(
  password: string,
  options: HashPasswordOptions,
): Result<{ result: string; salt: string }> {
  const validated = $validateHashPasswordOptions(password, options, "node");
  if (validated.error) return $err(validated.error);

  const { digestAlgo, outputEncoding, saltLength, iterations, keyLength } = validated;

  const salt = nodeCrypto.randomBytes(saltLength);
  const hash = nodeCrypto.pbkdf2Sync(password.normalize("NFKC"), salt, iterations, keyLength, digestAlgo.node);

  try {
    const saltStr = $convertBytesToStr(salt, outputEncoding);
    if (saltStr.error) return $err(saltStr.error);

    const hashStr = $convertBytesToStr(hash, outputEncoding);
    if (hashStr.error) return $err(hashStr.error);

    return $ok({ result: hashStr.result, salt: saltStr.result });
  } catch (error) {
    return $err({ message: "node hashPassword: Failed to hash password", description: $fmtError(error) });
  } finally {
    salt.fill(0);
    hash.fill(0);
  }
}

export function $verifyPassword(
  password: string,
  hashedPassword: string,
  salt: string,
  options: VerifyPasswordOptions,
): Result<boolean> {
  const validated = $validateVerifyPasswordOptions(password, hashedPassword, salt, options, "node");
  if (validated.error) return $err(validated.error);

  const { digestAlgo, inputEncoding, iterations, keyLength } = validated;

  const saltBytes = $convertStrToBytes(salt, inputEncoding);
  if (saltBytes.error) return $err(saltBytes.error);

  const hashedPasswordBytes = $convertStrToBytes(hashedPassword, inputEncoding);
  if (hashedPasswordBytes.error) return $err(hashedPasswordBytes.error);

  if (hashedPasswordBytes.result.byteLength !== keyLength) return $ok(false);

  try {
    const derived = nodeCrypto.pbkdf2Sync(
      password.normalize("NFKC"),
      saltBytes.result,
      iterations,
      keyLength,
      digestAlgo.node,
    );

    const expected = hashedPasswordBytes.result;

    const left = Buffer.alloc(keyLength);
    const right = Buffer.alloc(keyLength);
    derived.copy(left);
    expected.copy(right);

    try {
      const matches = nodeCrypto.timingSafeEqual(left, right);
      return $ok(matches);
    } finally {
      left.fill(0);
      right.fill(0);
      derived.fill(0);
    }
  } catch (error) {
    return $err({ message: "node verifyPassword: Verification failed", description: $fmtError(error) });
  } finally {
    saltBytes.result.fill(0);
    hashedPasswordBytes.result.fill(0);
  }
}
