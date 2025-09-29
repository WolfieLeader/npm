import * as nodeCryptoKit from "./node/kit";
import * as webCryptoKit from "./web/kit";

export {
  parseToObj,
  stringifyObj,
  tryParseToObj,
  tryStringifyObj,
} from "~/helpers/object";
export {
  ENCRYPTED_REGEX,
  matchPattern,
} from "~/helpers/validate";
export type * from "./helpers/types";

/**
 * Node.js cryptography kit (Crypto Node.js API).
 *
 * Can be imported directly from 'cipher-kit/node' for smaller bundle size.
 *
 * - Uses Node's `crypto` module.
 * - Synchronous API (throwing) + safe wrappers that return `Result` (non-throwing).
 * - JSDoc comments with `Explain Like I'm Five` sections.
 *
 * #### Contains:
 * - Secret key creation from passphrase.
 * - Data encryption and decryption.
 * - Object encryption and decryption.
 * - Data hashing (digest).
 * - Password hashing and verification with time-safe comparison.
 * - Object serialization and deserialization (to/from JSON).
 * - Pattern matching to validate encrypted data format.
 *
 * ### 🍼 Explain Like I'm Five
 * It's like a toolkit that helps you keep your and your users' secrets safe when using Node.js.
 */
export const nodeKit = nodeCryptoKit;

/**
 * Web, Deno, Bun and Cloudflare Workers cryptography kit (Crypto Web API).
 *
 * Can be imported directly from 'cipher-kit/web-api' for smaller bundle size.
 *
 * - Uses the Web Crypto API (`crypto.subtle`).
 * - Async API (Promise) + safe wrappers that return `Result`.
 * - JSDoc comments with `Explain Like I'm Five` sections.
 *
 * #### Contains:
 * - Secret key creation from passphrase.
 * - Data encryption and decryption.
 * - Object encryption and decryption.
 * - Data hashing (digest).
 * - Password hashing and verification with time-safe comparison.
 * - Object serialization and deserialization (to/from JSON).
 * - Pattern matching to validate encrypted data format.
 *
 * ### 🍼 Explain Like I'm Five
 * It's like a toolkit that helps you keep your and your users' secrets safe when using the web
 * or other Node.js alternatives like Deno, Bun, or Cloudflare Workers.
 */
export const webKit = webCryptoKit;
