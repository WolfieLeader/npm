// Checks for workerd, the Cloudflare Workers runtime. Each returns (or resolves to) true, or throws.
// A Worker module may export only handlers, so the entries `worker.mjs` and `compat.mjs` import these.
import * as web from "cipher-kit/web-api";
import { compress, compressObj, decompress, decompressObj } from "compress-kit";

export const SECRET = "workers-check-secret-0123456789";
const TEXT = "héllo 🌍 from Node";
// cipher-kit's Node kit made these with SECRET and TEXT. Matching them proves the formats agree across runtimes.
export const NODE_CIPHERTEXT = "LfauPBFy-U14u66O.dIrFjLnSPvrcVyC2ermqVr1JlWom.BMJqOuarcnSrMRdFX0zH3A.";
const NODE_SHA256_OF_ABC = "ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0";

/** @type {Record<string, () => boolean | Promise<boolean>>} */
const checks = {
  "decrypts a Node ciphertext": async () =>
    (await web.decrypt(NODE_CIPHERTEXT, await web.createSecretKey(SECRET))) === TEXT,
  "hash matches Node": async () => (await web.hash("abc")) === NODE_SHA256_OF_ABC,
  "AES-128, AES-192 and AES-256 GCM round trips": async () => {
    const algorithms = /** @type {const} */ (["aes128gcm", "aes192gcm", "aes256gcm"]);
    const results = await Promise.all(
      algorithms.map(async (algorithm) => {
        const key = await web.createSecretKey(SECRET, { algorithm });
        return (await web.decrypt(await web.encrypt(TEXT, key), key)) === TEXT;
      }),
    );
    return results.every(Boolean);
  },
  "encryptObj round trip": async () => {
    const key = await web.createSecretKey(SECRET);
    const back = await web.decryptObj(await web.encryptObj({ a: 1, b: ["x"] }, key), key);
    return JSON.stringify(back) === '{"a":1,"b":["x"]}';
  },
  "hashPassword with the default iterations": async () => {
    const { result, salt } = await web.hashPassword("correct horse");
    return await web.verifyPassword("correct horse", result, salt);
  },
  generateUuid: () => /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/.test(web.generateUuid()),
  "compress round trip": () => decompress(compress(TEXT.repeat(50))) === TEXT.repeat(50),
  "compressObj round trip": () => JSON.stringify(decompressObj(compressObj({ n: 1 }))) === '{"n":1}',
};

/**
 * Runs `checks` plus `extra` and answers with one line per check: status 200 when all pass, 500 otherwise.
 * @param {Record<string, () => boolean | Promise<boolean>>} extra
 */
export async function respond(extra = {}) {
  const lines = await Promise.all(
    Object.entries({ ...checks, ...extra }).map(async ([name, check]) => {
      try {
        return (await check()) ? `✔ ${name}` : `✖ ${name}: returned false`;
      } catch (error) {
        return `✖ ${name}: threw ${String(error)}`;
      }
    }),
  );
  const failed = lines.some((line) => line.startsWith("✖"));
  return new Response(lines.join("\n"), { status: failed ? 500 : 200 });
}
