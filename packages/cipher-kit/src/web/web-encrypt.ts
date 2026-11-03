import {
  $err,
  $fmtError,
  $fmtResultErr,
  $isPlainObj,
  $isWellFormedStr,
  $ok,
  $parseToObj,
  $stringifyObj,
  bytesToStr,
} from "@internal/helpers";
import type { Result } from "@internal/helpers";
import { GCM_IV_LENGTH, GCM_TAG_BYTES } from "~/helpers/consts.js";
import type { CipherEncoding, DecryptOptions, EncryptOptions } from "~/helpers/types.js";
import {
  $cipherEncodingErr,
  $isCipherEncoding,
  $resolveAdditionalData,
  matchEncryptedPattern,
} from "~/helpers/validate.js";
import { $convertBytesToStr, $convertStrToBytes } from "./web-encode.js";
import { $isWebSecretKey } from "./web-secret-key.js";
import type { WebSecretKey } from "./web-secret-key.js";

/** AES-GCM parameters, with `additionalData` only when there is some. */
function $gcmParams(
  injectedKey: WebSecretKey,
  iv: Uint8Array<ArrayBuffer>,
  aad: Uint8Array<ArrayBuffer> | undefined,
): { name: "AES-GCM"; iv: Uint8Array<ArrayBuffer>; additionalData?: Uint8Array<ArrayBuffer> } {
  const name = injectedKey.injected.web;
  return aad ? { name, iv, additionalData: aad } : { name, iv };
}

export async function $encrypt(
  data: string,
  secretKey: WebSecretKey,
  options: EncryptOptions,
): Promise<Result<string>> {
  // Any well-formed, non-empty string: whitespace is allowed. "" is rejected because its empty
  // ciphertext segment would not match the "iv.cipher.tag." format.
  if (!$isWellFormedStr(data, 1)) {
    return $err({
      message: "web encrypt: Data must be a non-empty string",
      description: "Received an empty string, a non-string value, or a string with lone UTF-16 surrogates",
    });
  }

  if (!$isPlainObj<EncryptOptions>(options)) {
    return $err({
      message: "web encrypt: Options must be a plain object",
      description: 'Pass an object like { outputEncoding: "base64url" }',
    });
  }

  const outputEncoding = options.outputEncoding ?? "base64url";
  if (!$isCipherEncoding(outputEncoding)) return $cipherEncodingErr("web encrypt", "output");
  const { aad, error: aadError } = $resolveAdditionalData(options.additionalData, "web encrypt");
  if (aadError) return $err(aadError);

  const injectedKey = $isWebSecretKey(secretKey);
  if (!injectedKey) {
    return $err({
      message: "web encrypt: Invalid secret key",
      description: "Expected a WebSecretKey created by webKit.createSecretKey()",
    });
  }

  const { result, error: encodeError } = $convertStrToBytes(data, "utf8");
  if (encodeError) return $err(encodeError);

  try {
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(GCM_IV_LENGTH));
    const cipherWithTag = await globalThis.crypto.subtle.encrypt(
      $gcmParams(injectedKey, iv, aad),
      injectedKey.key,
      result,
    );

    const cipherOnly = cipherWithTag.slice(0, cipherWithTag.byteLength - GCM_TAG_BYTES);
    const tag = cipherWithTag.slice(cipherWithTag.byteLength - GCM_TAG_BYTES);

    // outputEncoding is validated above, so these encoders cannot fail.
    const encode = bytesToStr[outputEncoding];
    return $ok(`${encode(iv)}.${encode(new Uint8Array(cipherOnly))}.${encode(new Uint8Array(tag))}.`);
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
  if (!$isCipherEncoding(inputEncoding)) return $cipherEncodingErr("web decrypt", "input");
  const { aad, error: aadError } = $resolveAdditionalData(options.additionalData, "web decrypt");
  if (aadError) return $err(aadError);

  const injectedKey = $isWebSecretKey(secretKey);
  if (!injectedKey) {
    return $err({
      message: "web decrypt: Invalid secret key",
      description: "Expected a WebSecretKey created by webKit.createSecretKey()",
    });
  }

  const parts = $decodeParts(encrypted, inputEncoding);
  if (parts.error) return $err(parts.error);
  return $decipher(parts.result, injectedKey, aad);
}

interface DecodedParts {
  iv: Uint8Array<ArrayBuffer>;
  cipherWithTag: Uint8Array<ArrayBuffer>;
}

interface DecodedSegments {
  iv: Uint8Array<ArrayBuffer>;
  cipher: Uint8Array<ArrayBuffer>;
  tag: Uint8Array<ArrayBuffer>;
}

/** Splits `"iv.cipher.tag."` and decodes each segment. */
function $decodeSegments(encrypted: string, inputEncoding: CipherEncoding): Result<{ result: DecodedSegments }> {
  // matchEncryptedPattern() already guaranteed three non-empty segments, so the defaults never apply.
  const [iv = "", cipher = "", tag = ""] = encrypted.split(".", 4);
  const ivBytes = $convertStrToBytes(iv, inputEncoding);
  const cipherBytes = $convertStrToBytes(cipher, inputEncoding);
  const tagBytes = $convertStrToBytes(tag, inputEncoding);

  if (ivBytes.error || cipherBytes.error || tagBytes.error) {
    return $err({
      message: "web decrypt: Failed to decode input",
      description: `Conversion error: ${$fmtResultErr(ivBytes.error ?? cipherBytes.error ?? tagBytes.error)}`,
    });
  }
  return $ok({ result: { iv: ivBytes.result, cipher: cipherBytes.result, tag: tagBytes.result } });
}

function $decodeParts(encrypted: string, inputEncoding: CipherEncoding): Result<{ result: DecodedParts }> {
  const decoded = $decodeSegments(encrypted, inputEncoding);
  if (decoded.error) return $err(decoded.error);
  const { iv: ivB, cipher: cipherB, tag: tagB } = decoded.result;
  if (ivB.byteLength !== GCM_IV_LENGTH) {
    return $err({
      message: "web decrypt: Invalid IV length",
      description: `Expected ${GCM_IV_LENGTH} bytes, got ${ivB.byteLength}`,
    });
  }
  if (tagB.byteLength !== GCM_TAG_BYTES) {
    return $err({
      message: "web decrypt: Invalid auth tag length",
      description: `Expected ${GCM_TAG_BYTES} bytes, got ${tagB.byteLength}`,
    });
  }

  const cipherWithTag = new Uint8Array(cipherB.byteLength + tagB.byteLength);
  cipherWithTag.set(cipherB, 0);
  cipherWithTag.set(tagB, cipherB.byteLength);
  return $ok({ result: { iv: ivB, cipherWithTag } });
}

async function $decipher(
  parts: DecodedParts,
  injectedKey: WebSecretKey,
  aad: Uint8Array<ArrayBuffer> | undefined,
): Promise<Result<string>> {
  let decrypted: Uint8Array | undefined;
  try {
    decrypted = new Uint8Array(
      await globalThis.crypto.subtle.decrypt(
        $gcmParams(injectedKey, parts.iv, aad),
        injectedKey.key,
        parts.cipherWithTag,
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
  return $encrypt(result, secretKey, options);
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
