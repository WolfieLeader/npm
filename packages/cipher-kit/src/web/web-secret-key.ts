import { $err, $fmtError, $ok } from "@internal/helpers";
import type { Result } from "@internal/helpers";
import type { DIGEST_ALGORITHMS, ENCRYPTION_ALGORITHMS } from "~/helpers/consts.js";
import type { CreateSecretKeyOptions, EncryptionAlgorithm } from "~/helpers/types.js";
import { $isObj, $validateCreateSecretKeyOptions, $validateSecretKeyBase } from "~/helpers/validate.js";
import { textEncoder } from "./web-encode.js";

declare const __brand: unique symbol;

export type WebSecretKey = {
  readonly platform: "web";
  readonly digest: keyof typeof DIGEST_ALGORITHMS;
  readonly algorithm: keyof typeof ENCRYPTION_ALGORITHMS;
  readonly key: CryptoKey;
  readonly injected: (typeof ENCRYPTION_ALGORITHMS)[keyof typeof ENCRYPTION_ALGORITHMS];
} & { readonly [__brand]: "secretKey-web" };

/** `CryptoKey` is missing on some runtimes, although the DOM types always declare it. */
function $isCryptoKey(x: unknown): x is CryptoKey {
  const cryptoKeyClass: unknown = globalThis.CryptoKey;
  return cryptoKeyClass !== undefined && x instanceof CryptoKey;
}

/** Checks that the key's algorithm, length and usages match the declared encryption algorithm. */
function $matchesKeyAlgorithm(key: CryptoKey, algorithm: (typeof ENCRYPTION_ALGORITHMS)[EncryptionAlgorithm]): boolean {
  return (
    $isObj(key.algorithm) &&
    key.algorithm.name === algorithm.web &&
    (typeof key.algorithm["length"] !== "number" || key.algorithm["length"] === algorithm.keyBytes * 8) &&
    Array.isArray(key.usages) &&
    key.usages.includes("encrypt") &&
    key.usages.includes("decrypt")
  );
}

/** Runtime shape check for a key made by {@link $createSecretKey}. The brand exists only in types. */
function $hasWebSecretKeyShape(x: unknown): x is WebSecretKey {
  const base = $validateSecretKeyBase(x, "web");
  if (!base) return false;
  return $isCryptoKey(base.obj["key"]) && $matchesKeyAlgorithm(base.obj["key"], base.algorithm);
}

export function $isWebSecretKey(x: unknown): WebSecretKey | null {
  return $hasWebSecretKeyShape(x) ? x : null;
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
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- mints the brand, which has no runtime value to check
    const secretKey = Object.freeze({ platform: "web", digest, algorithm, key, injected: encryptAlgo }) as WebSecretKey;

    return $ok({ result: secretKey });
  } catch (error) {
    return $err({
      message: "web createSecretKey: Failed to derive key",
      description: $fmtError(error),
    });
  }
}
