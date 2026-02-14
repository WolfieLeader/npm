import { Buffer } from "node:buffer";
import nodeCrypto from "node:crypto";
import { $err, $fmtError, $isPlainObj, $isStr, $ok, type Result } from "@internal/helpers";
import { CIPHER_ENCODING, DIGEST_ALGORITHMS } from "~/helpers/consts.js";
import type { HashOptions, HashPasswordOptions, VerifyPasswordOptions } from "~/helpers/types.js";
import { $validateHashPasswordOptions, $validateVerifyPasswordOptions } from "~/helpers/validate.js";
import { $convertBytesToStr, $convertStrToBytes } from "./node-encode.js";

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
