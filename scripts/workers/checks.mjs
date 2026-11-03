// Checks for workerd, the Cloudflare Workers runtime. Each returns (or resolves to) true, or throws.
// A Worker module may export only handlers, so the entries `worker.mjs` and `compat.mjs` import these.
import * as web from "cipher-kit/web-api";
import { compress, compressObj, decompress, decompressObj } from "compress-kit";

export const SECRET = "workers-check-secret-0123456789";
const TEXT = "héllo 🌍 from Node";
// cipher-kit's Node kit made these with SECRET and TEXT. Matching them proves the formats agree across runtimes.
export const NODE_CIPHERTEXT = "LfauPBFy-U14u66O.dIrFjLnSPvrcVyC2ermqVr1JlWom.BMJqOuarcnSrMRdFX0zH3A.";
const NODE_SHA256_OF_ABC = "ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0";
const RFC_4231_CASE_2_SHA256 = "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843";

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
  "hashPassword at the deployed Workers PBKDF2 cap of 100,000 iterations": async () => {
    const { result, salt } = await web.hashPassword("correct horse", { iterations: 100_000 });
    return await web.verifyPassword("correct horse", result, salt, { iterations: 100_000 });
  },
  generateUuid: () => /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/.test(web.generateUuid()),
  "generateUuid version 7": () => {
    const uuid = web.generateUuid({ version: 7 });
    const ms = Number.parseInt(uuid.replaceAll("-", "").slice(0, 12), 16);
    return /^[\da-f]{8}-[\da-f]{4}-7[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/.test(uuid) && ms <= Date.now() && ms > 0;
  },
  "hmac matches RFC 4231 test case 2 and verifies": async () => {
    const mac = await web.hmac("what do ya want for nothing?", "Jefe", { outputEncoding: "hex" });
    const verified = await web.verifyHmac("what do ya want for nothing?", mac, "Jefe", { inputEncoding: "hex" });
    return mac === RFC_4231_CASE_2_SHA256 && verified;
  },
  "verifyHmac rejects a truncated MAC": async () =>
    !(await web.verifyHmac("data", (await web.hmac("data", "key", { outputEncoding: "hex" })).slice(0, 2), "key", {
      inputEncoding: "hex",
    })),
  randomToken: () => /^[\w-]{43}$/.test(web.randomToken()) && /^[\da-f]{16}$/.test(web.randomToken(8, "hex")),
  randomCode: () => /^\d{6}$/.test(web.randomCode()) && /^\d{9}$/.test(web.randomCode(9)),
  "compress round trip": () => decompress(compress(TEXT.repeat(50))) === TEXT.repeat(50),
  "compressObj round trip": () => JSON.stringify(decompressObj(compressObj({ n: 1 }))) === '{"n":1}',
};

/**
 * Runs `checks` plus `extra`, prints one line per check, and throws when any fails, so `workerd test` fails.
 * @param {Record<string, () => boolean | Promise<boolean>>} extra
 */
export async function run(extra = {}) {
  const lines = await Promise.all(
    Object.entries({ ...checks, ...extra }).map(async ([name, check]) => {
      try {
        return (await check()) ? `✔ ${name}` : `✖ ${name}: returned false`;
      } catch (error) {
        return `✖ ${name}: threw ${String(error)}`;
      }
    }),
  );
  console.log(lines.join("\n"));
  if (lines.some((line) => line.startsWith("✖"))) throw new Error("A Workers check failed");
}
