// @ts-nocheck
import type { CipherEncoding, EncryptOptions, HashOptions, SecretKey } from "cipher-kit";
import type { createSecretKey, tryHash } from "cipher-kit/node";
import type { createSecretKey as webCreateSecretKey } from "cipher-kit/web-api";

const _secretKey: SecretKey<"node"> = {} as SecretKey<"node">;
const _webSecretKey: SecretKey<"web"> = {} as SecretKey<"web">;
const _encoding: CipherEncoding = "base64url";
const _encryptOpts: EncryptOptions = { outputEncoding: "base64url" };
const _hashOpts: HashOptions = { digest: "sha256" };
const _createKey: typeof createSecretKey = {} as typeof createSecretKey;
const _tryHash: typeof tryHash = {} as typeof tryHash;
const _webCreateKey: typeof webCreateSecretKey = {} as typeof webCreateSecretKey;
