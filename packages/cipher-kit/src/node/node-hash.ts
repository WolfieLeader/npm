import { Buffer } from "node:buffer";
import nodeCrypto from "node:crypto";
import { $err, $fmtError, $ok } from "@internal/helpers";
import type { Result } from "@internal/helpers";
import type { HashOptions, HashPasswordOptions, VerifyPasswordOptions } from "~/helpers/types.js";
import {
  $validateHashOptions,
  $validateHashPasswordOptions,
  $validateVerifyPasswordOptions,
} from "~/helpers/validate.js";
import { $convertBytesToStr, $convertStrToBytes } from "./node-encode.js";

export function $hash(data: string, options: HashOptions = {}): Result<string> {
  const validated = $validateHashOptions(data, options, "node");
  if (validated.error) return $err(validated.error);
  const { digestAlgo, outputEncoding } = validated;

  const { result, error: encodeError } = $convertStrToBytes(data, "utf8");
  if (encodeError) return $err(encodeError);

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

  let salt: Buffer | undefined;
  let hash: Buffer | undefined;
  try {
    salt = nodeCrypto.randomBytes(saltLength);
    hash = nodeCrypto.pbkdf2Sync(password.normalize("NFKC"), salt, iterations, keyLength, digestAlgo.node);
    return $ok({ result: hash.toString(outputEncoding), salt: salt.toString(outputEncoding) });
  } catch (error) {
    return $err({ message: "node hashPassword: Failed to hash password", description: $fmtError(error) });
  } finally {
    salt?.fill(0);
    hash?.fill(0);
  }
}

export function $verifyPassword(
  password: string,
  hashedPassword: string,
  salt: string,
  options: VerifyPasswordOptions,
): Result<boolean> {
  const validated = $validateVerifyPasswordOptions({ password, hashedPassword, salt }, options, "node");
  if (validated.error) return $err(validated.error);

  const { digestAlgo, inputEncoding, iterations, keyLength } = validated;

  const saltBytes = $convertStrToBytes(salt, inputEncoding);
  if (saltBytes.error) return $err(saltBytes.error);

  const hashedPasswordBytes = $convertStrToBytes(hashedPassword, inputEncoding);
  if (hashedPasswordBytes.error) return $err(hashedPasswordBytes.error);

  if (hashedPasswordBytes.result.byteLength !== keyLength) {
    saltBytes.result.fill(0);
    hashedPasswordBytes.result.fill(0);
    return $ok(false);
  }

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
