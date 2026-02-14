import * as nodeCryptoKit from "./node/kit.js";
import * as webCryptoKit from "./web/kit.js";

export type { Result } from "@internal/helpers";
export {
  parseToObj,
  stringifyObj,
  tryParseToObj,
  tryStringifyObj,
} from "~/helpers/object.js";
export {
  ENCRYPTED_REGEX,
  matchEncryptedPattern,
} from "~/helpers/validate.js";
export type {
  CipherEncoding,
  CreateSecretKeyOptions,
  DecryptOptions,
  DigestAlgorithm,
  Encoding,
  EncryptionAlgorithm,
  EncryptOptions,
  ErrorStruct,
  HashOptions,
  HashPasswordOptions,
  VerifyPasswordOptions,
} from "./helpers/types.js";

export type { NodeSecretKey } from "./node/node-secret-key.js";
export type { WebSecretKey } from "./web/web-secret-key.js";

/**
 * Node.js cryptography kit using the built-in `crypto` module.
 *
 * Synchronous API with throwing and `Result`-returning (`try*`) variants.
 * Can be imported directly from `cipher-kit/node` for a smaller bundle.
 */
export const nodeKit = nodeCryptoKit;

/**
 * Web Crypto API kit for browsers, Deno, Bun, and Cloudflare Workers.
 *
 * Async API with throwing and `Result`-returning (`try*`) variants.
 * Can be imported directly from `cipher-kit/web-api` for a smaller bundle.
 */
export const webKit = webCryptoKit;
