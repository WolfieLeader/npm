// @ts-nocheck

// Type resolution smoke test — confirms TypeScript can resolve public types
import type { CipherEncoding, EncryptOptions, HashOptions, SecretKey } from "cipher-kit";
import type { createSecretKey, tryHash } from "cipher-kit/node";
import type { compress, tryCompress } from "compress-kit";
import type { GenerateCertsOptions } from "generate-certs";
import type { getClientIp } from "get-client-ip";
import type { CookieOptions } from "modern-cookies";

// Verify cipher-kit types resolve
const _secretKey: SecretKey<"node"> = {} as SecretKey<"node">;
const _encoding: CipherEncoding = "base64url";
const _encryptOpts: EncryptOptions = { outputEncoding: "base64url" };
const _hashOpts: HashOptions = { digest: "sha256" };

// Verify cipher-kit/node function signatures resolve
const _createKey: typeof createSecretKey = {} as typeof createSecretKey;
const _tryHash: typeof tryHash = {} as typeof tryHash;

// Verify compress-kit function signatures resolve
const _compress: typeof compress = {} as typeof compress;
const _tryCompress: typeof tryCompress = {} as typeof tryCompress;

// Verify generate-certs types resolve
const _certsOpts: GenerateCertsOptions = { certsPath: "/tmp", activateLogs: false };

// Verify get-client-ip function signature resolves
const _getClientIp: typeof getClientIp = {} as typeof getClientIp;

// Verify modern-cookies types resolve
const _cookieOpts: CookieOptions = { httpOnly: true, secure: true, sameSite: "strict" };
