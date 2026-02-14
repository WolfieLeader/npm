import { $err, $fmtError, $isPlainObj, $isStr, $ok, type Result } from "@internal/helpers";
import { CIPHER_ENCODING, DIGEST_ALGORITHMS } from "~/helpers/consts.js";
import type { HashOptions, HashPasswordOptions, VerifyPasswordOptions } from "~/helpers/types.js";
import { $validateHashPasswordOptions, $validateVerifyPasswordOptions } from "~/helpers/validate.js";
import { $convertBytesToStr, $convertStrToBytes, textEncoder } from "./web-encode.js";

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
