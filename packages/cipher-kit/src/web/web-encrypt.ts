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
import { $convertBytesToStr, $convertStrToBytes } from "./web-encode.js";
import { $isWebSecretKey, type WebSecretKey } from "./web-secret-key.js";

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
