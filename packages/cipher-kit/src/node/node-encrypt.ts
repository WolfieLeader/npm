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
import { CIPHER_ENCODING, GCM_IV_LENGTH, GCM_TAG_BYTES } from "~/helpers/consts.js";
import type { DecryptOptions, EncryptOptions } from "~/helpers/types.js";
import { matchEncryptedPattern } from "~/helpers/validate.js";
import { $convertBytesToStr, $convertStrToBytes } from "./node-encode.js";
import { $isNodeSecretKey, type NodeSecretKey } from "./node-secret-key.js";

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
