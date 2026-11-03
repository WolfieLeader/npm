import { Buffer } from "node:buffer";
import nodeCrypto from "node:crypto";
import {
  $err,
  $fmtError,
  $fmtResultErr,
  $isPlainObj,
  $isWellFormedStr,
  $ok,
  $parseToObj,
  $stringifyObj,
} from "@internal/helpers";
import type { Result } from "@internal/helpers";
import { GCM_IV_LENGTH, GCM_TAG_BYTES } from "~/helpers/consts.js";
import type { CipherEncoding, DecryptOptions, EncryptOptions } from "~/helpers/types.js";
import { $cipherEncodingErr, $isCipherEncoding, matchEncryptedPattern } from "~/helpers/validate.js";
import { $convertBytesToStr, $convertStrToBytes } from "./node-encode.js";
import { $isNodeSecretKey } from "./node-secret-key.js";
import type { NodeSecretKey } from "./node-secret-key.js";

const INVALID_KEY = "Expected a NodeSecretKey created by nodeKit.createSecretKey()";

export function $encrypt(data: string, secretKey: NodeSecretKey, options: EncryptOptions): Result<string> {
  // Any well-formed, non-empty string: whitespace is allowed. "" is rejected because its empty
  // ciphertext segment would not match the "iv.cipher.tag." format.
  if (!$isWellFormedStr(data, 1)) {
    return $err({
      message: "node encrypt: Data must be a non-empty string",
      description: "Received an empty string, a non-string value, or a string with lone UTF-16 surrogates",
    });
  }
  if (!$isPlainObj<EncryptOptions>(options)) {
    return $err({
      message: "node encrypt: Options must be a plain object",
      description: 'Pass an object like { outputEncoding: "base64url" }',
    });
  }
  const outputEncoding = options.outputEncoding ?? "base64url";
  if (!$isCipherEncoding(outputEncoding)) return $cipherEncodingErr("node encrypt", "output");

  const injectedKey = $isNodeSecretKey(secretKey);
  if (!injectedKey) return $err({ message: "node encrypt: Invalid secret key", description: INVALID_KEY });

  const { result, error: encodeError } = $convertStrToBytes(data, "utf8");
  if (encodeError) return $err(encodeError);

  try {
    const iv = nodeCrypto.randomBytes(GCM_IV_LENGTH);
    const cipher = nodeCrypto.createCipheriv(injectedKey.injected.node, injectedKey.key, iv);
    const encrypted = Buffer.concat([cipher.update(result), cipher.final()]);
    const tag = cipher.getAuthTag();
    const enc = outputEncoding;
    return $ok(`${iv.toString(enc)}.${encrypted.toString(enc)}.${tag.toString(enc)}.`);
  } catch (error) {
    return $err({ message: "node encrypt: Failed to encrypt data", description: $fmtError(error) });
  } finally {
    result.fill(0);
  }
}

interface DecodedParts {
  iv: Buffer;
  cipher: Buffer;
  tag: Buffer;
}

/** Splits `"iv.cipher.tag."` and decodes each segment. */
function $decodeSegments(encrypted: string, inputEncoding: CipherEncoding): Result<{ result: DecodedParts }> {
  // matchEncryptedPattern() already guaranteed three non-empty segments, so the defaults never apply.
  const [iv = "", cipher = "", tag = ""] = encrypted.split(".", 4);
  const ivBytes = $convertStrToBytes(iv, inputEncoding);
  const cipherBytes = $convertStrToBytes(cipher, inputEncoding);
  const tagBytes = $convertStrToBytes(tag, inputEncoding);

  if (ivBytes.error || cipherBytes.error || tagBytes.error) {
    return $err({
      message: "node decrypt: Failed to decode input",
      description: `Conversion error: ${$fmtResultErr(ivBytes.error ?? cipherBytes.error ?? tagBytes.error)}`,
    });
  }
  return $ok({ result: { iv: ivBytes.result, cipher: cipherBytes.result, tag: tagBytes.result } });
}

function $decodeParts(encrypted: string, inputEncoding: CipherEncoding): Result<{ result: DecodedParts }> {
  const decoded = $decodeSegments(encrypted, inputEncoding);
  if (decoded.error) return $err(decoded.error);
  const parts = decoded.result;
  if (parts.iv.byteLength !== GCM_IV_LENGTH) {
    return $err({
      message: "node decrypt: Invalid IV length",
      description: `Expected ${GCM_IV_LENGTH} bytes, got ${parts.iv.byteLength}`,
    });
  }
  if (parts.tag.byteLength !== GCM_TAG_BYTES) {
    return $err({
      message: "node decrypt: Invalid auth tag length",
      description: `Expected ${GCM_TAG_BYTES} bytes, got ${parts.tag.byteLength}`,
    });
  }
  return $ok({ result: parts });
}

function $decipher(parts: DecodedParts, injectedKey: NodeSecretKey): Result<string> {
  let decrypted: Buffer | undefined;
  try {
    const decipher = nodeCrypto.createDecipheriv(injectedKey.injected.node, injectedKey.key, parts.iv);
    decipher.setAuthTag(parts.tag);
    decrypted = Buffer.concat([decipher.update(parts.cipher), decipher.final()]);
  } catch (error) {
    return $err({ message: "node decrypt: Failed to decrypt data", description: $fmtError(error) });
  }
  try {
    // Strict UTF-8: invalid bytes fail instead of becoming U+FFFD, matching Web.
    return $convertBytesToStr(decrypted, "utf8");
  } finally {
    decrypted.fill(0);
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
  if (!$isCipherEncoding(inputEncoding)) return $cipherEncodingErr("node decrypt", "input");

  const injectedKey = $isNodeSecretKey(secretKey);
  if (!injectedKey) return $err({ message: "node decrypt: Invalid secret key", description: INVALID_KEY });

  const parts = $decodeParts(encrypted, inputEncoding);
  if (parts.error) return $err(parts.error);
  return $decipher(parts.result, injectedKey);
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
