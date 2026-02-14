import nodeCrypto from "node:crypto";
import { $err, $fmtError, $ok, type Result } from "@internal/helpers";
import type { CreateSecretKeyOptions } from "~/export.js";
import type { DIGEST_ALGORITHMS, ENCRYPTION_ALGORITHMS } from "~/helpers/consts.js";
import { $validateCreateSecretKeyOptions, $validateSecretKeyBase } from "~/helpers/validate.js";

declare const __brand: unique symbol;

export type NodeSecretKey = {
  readonly platform: "node";
  readonly digest: keyof typeof DIGEST_ALGORITHMS;
  readonly algorithm: keyof typeof ENCRYPTION_ALGORITHMS;
  readonly key: nodeCrypto.KeyObject;
  readonly injected: (typeof ENCRYPTION_ALGORITHMS)[keyof typeof ENCRYPTION_ALGORITHMS];
} & { readonly [__brand]: "secretKey-node" };

export function $isNodeSecretKey(x: unknown): NodeSecretKey | null {
  const base = $validateSecretKeyBase(x, "node");
  if (!base) return null;

  if (
    !(base.obj.key instanceof nodeCrypto.KeyObject) ||
    (typeof base.obj.key.symmetricKeySize === "number" && base.obj.key.symmetricKeySize !== base.algorithm.keyBytes)
  ) {
    return null;
  }
  return x as NodeSecretKey;
}

export function $createSecretKey(secret: string, options: CreateSecretKeyOptions): Result<{ result: NodeSecretKey }> {
  const validated = $validateCreateSecretKeyOptions(secret, options, "node");
  if (validated.error) return $err(validated.error);

  const { algorithm, digest, salt, info, encryptAlgo, digestAlgo } = validated;

  try {
    const derivedKey = Buffer.from(
      nodeCrypto.hkdfSync(
        digestAlgo.node,
        secret.normalize("NFKC"),
        salt.normalize("NFKC"),
        info.normalize("NFKC"),
        encryptAlgo.keyBytes,
      ),
    );
    try {
      const key = nodeCrypto.createSecretKey(derivedKey);
      const secretKey = Object.freeze({
        platform: "node",
        digest,
        algorithm,
        key,
        injected: encryptAlgo,
      }) as NodeSecretKey;

      return $ok({ result: secretKey });
    } finally {
      derivedKey.fill(0);
    }
  } catch (error) {
    return $err({ message: "node createSecretKey: Failed to derive key", description: $fmtError(error) });
  }
}
