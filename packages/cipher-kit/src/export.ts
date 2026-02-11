import * as nodeCryptoKit from "./node/kit.js";
import * as webCryptoKit from "./web/kit.js";

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
export type * from "./helpers/types.js";

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
