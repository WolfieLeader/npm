import { $err, $fmtError, $ok, type Result } from "@internal/helpers";
import type { DIGEST_ALGORITHMS, ENCRYPTION_ALGORITHMS } from "~/helpers/consts.js";
import type { CreateSecretKeyOptions } from "~/helpers/types.js";
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

export function $isWebSecretKey(x: unknown): WebSecretKey | null {
  const base = $validateSecretKeyBase(x, "web");
  if (!base) return null;

  if (typeof globalThis.CryptoKey === "undefined" || !(base.obj.key instanceof CryptoKey)) return null;

  if (
    !$isObj(base.obj.key.algorithm) ||
    base.obj.key.algorithm.name !== base.algorithm.web ||
    (typeof base.obj.key.algorithm.length === "number" &&
      base.obj.key.algorithm.length !== base.algorithm.keyBytes * 8) ||
    !Array.isArray(base.obj.key.usages) ||
    !(base.obj.key.usages.includes("encrypt") && base.obj.key.usages.includes("decrypt"))
  ) {
    return null;
  }
  return x as WebSecretKey;
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
    const secretKey = Object.freeze({ platform: "web", digest, algorithm, key, injected: encryptAlgo }) as WebSecretKey;

    return $ok({ result: secretKey });
  } catch (error) {
    return $err({
      message: "web createSecretKey: Failed to derive key",
      description: $fmtError(error),
    });
  }
}
