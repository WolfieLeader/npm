import { $err, $fmtError, $ok } from "@internal/helpers";
import type { Result } from "@internal/helpers";
import type { HashOptions, HashPasswordOptions, VerifyPasswordOptions } from "~/helpers/types.js";
import {
  $validateHashOptions,
  $validateHashPasswordOptions,
  $validateVerifyPasswordOptions,
} from "~/helpers/validate.js";
import { $convertBytesToStr, $convertStrToBytes, textEncoder } from "./web-encode.js";

export async function $hash(data: string, options: HashOptions = {}): Promise<Result<string>> {
  const validated = $validateHashOptions(data, options, "web");
  if (validated.error) return $err(validated.error);
  const { digestAlgo, outputEncoding } = validated;

  const { result, error: encodeError } = $convertStrToBytes(data, "utf8");
  if (encodeError) return $err(encodeError);

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

  const salt = new Uint8Array(saltLength);
  let bits: ArrayBuffer | undefined;
  try {
    globalThis.crypto.getRandomValues(salt);
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
  const validated = $validateVerifyPasswordOptions({ password, hashedPassword, salt }, options, "web");
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

    // Best-effort constant-time comparison; JS JIT may introduce timing variation
    let diff = 0;
    for (let i = 0; i < keyLength; i++) {
      diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
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
    saltBytes.result.fill(0);
    hashedPasswordBytes.result.fill(0);
  }
}
