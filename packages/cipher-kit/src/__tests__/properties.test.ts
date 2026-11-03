import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import { nodeKit, tryParseToObj, tryStringifyObj, webKit } from "~/export.js";
import { anyText, secret } from "./__helpers__.js";

const anyValue = fc.anything({
  withNullPrototype: true,
  withBigInt: true,
  withMap: true,
  withSet: true,
  withDate: true,
});
const SENTINEL = "SENTINEL-7f3a";
const hostile = fc.oneof(anyValue, fc.constant(SENTINEL), fc.constant(Object.create(null) as unknown));
const optionKeys = fc.constantFrom(
  "algorithm",
  "digest",
  "salt",
  "info",
  "inputEncoding",
  "outputEncoding",
  "iterations",
  "keyLength",
  "saltLength",
  "length",
  "version",
);

type AnyFn = (...args: never[]) => unknown;
const call = (fn: AnyFn, ...args: unknown[]): unknown => (fn as (...a: unknown[]) => unknown)(...args);

/** The fields a safety check reads from any Result. */
function $resultShape(result: unknown): { success: unknown; error: string } {
  const { success, error } = result as { success: unknown; error?: unknown };
  return { success: typeof success, error: JSON.stringify(error ?? null) };
}

describe("cipher-kit properties", () => {
  const nodeKey = nodeKit.createSecretKey(secret);
  const webKey = webKit.createSecretKey(secret);

  test("any non-empty string round-trips between every pair of Node and Web", async () => {
    const web = await webKey;
    await fc.assert(
      fc.asyncProperty(
        anyText.filter((t) => t !== ""),
        async (text) => {
          const fromNode = nodeKit.encrypt(text, nodeKey);
          const fromWeb = await webKit.encrypt(text, web);
          expect(nodeKit.decrypt(fromNode, nodeKey)).toBe(text);
          expect(nodeKit.decrypt(fromWeb, nodeKey)).toBe(text);
          expect(await webKit.decrypt(fromNode, web)).toBe(text);
          expect(await webKit.decrypt(fromWeb, web)).toBe(text);
          expect(nodeKit.hash(text)).toBe(await webKit.hash(text));
        },
      ),
    );
  });

  test("hostile arguments to every Node try* function return a Result that never echoes them", () => {
    fc.assert(
      fc.property(hostile, hostile, optionKeys, hostile, (a, b, key, value) => {
        // A fast KDF keeps the password functions quick when the hostile value happens to be valid.
        const options = { iterations: 100_000, keyLength: 16, [key]: value };
        for (const result of [
          call(nodeKit.tryCreateSecretKey, a, options),
          call(nodeKit.tryEncrypt, a, nodeKey, options),
          call(nodeKit.tryEncrypt, SENTINEL, b, options),
          call(nodeKit.tryDecrypt, a, nodeKey, options),
          call(nodeKit.tryEncryptObj, a, nodeKey, options),
          call(nodeKit.tryDecryptObj, a, nodeKey, options),
          call(nodeKit.tryHash, a, options),
          call(nodeKit.tryHashPassword, a, options),
          call(nodeKit.tryVerifyPassword, a, b, SENTINEL, options),
          call(nodeKit.tryHmac, a, SENTINEL, options),
          call(nodeKit.tryHmac, SENTINEL, b, options),
          call(nodeKit.tryVerifyHmac, a, b, SENTINEL, options),
          call(nodeKit.tryVerifyHmac, SENTINEL, a, b, options),
          call(nodeKit.tryRandomToken, a, value),
          call(nodeKit.tryRandomCode, a),
          call(nodeKit.tryGenerateUuid, a),
          call(nodeKit.tryGenerateUuid, options),
          call(nodeKit.tryConvertStrToBytes, a, value),
          call(nodeKit.tryConvertBytesToStr, a, value),
          call(nodeKit.tryConvertEncoding, a, value, b),
          call(tryStringifyObj, a),
          call(tryParseToObj, a),
        ]) {
          const { success, error } = $resultShape(result);
          expect(success).toBe("boolean");
          expect(error).not.toContain(SENTINEL);
        }
      }),
      { numRuns: 300 },
    );
  });

  test("hostile arguments to the Web try* functions resolve to a Result that never echoes them", async () => {
    const web = await webKey;
    await fc.assert(
      fc.asyncProperty(hostile, hostile, optionKeys, hostile, async (a, b, key, value) => {
        const options = { [key]: value };
        for (const result of await Promise.all([
          call(webKit.tryCreateSecretKey, a, options),
          call(webKit.tryEncrypt, a, web, options),
          call(webKit.tryEncrypt, SENTINEL, b, options),
          call(webKit.tryDecrypt, a, web, options),
          call(webKit.tryEncryptObj, a, web, options),
          call(webKit.tryDecryptObj, a, web, options),
          call(webKit.tryHash, a, options),
          call(webKit.tryHmac, a, SENTINEL, options),
          call(webKit.tryHmac, SENTINEL, b, options),
          call(webKit.tryVerifyHmac, a, b, SENTINEL, options),
          call(webKit.tryVerifyHmac, SENTINEL, a, b, options),
          call(webKit.tryRandomToken, a, value),
          call(webKit.tryRandomCode, a),
          call(webKit.tryGenerateUuid, a),
          call(webKit.tryGenerateUuid, options),
          call(webKit.tryConvertStrToBytes, a, value),
          call(webKit.tryConvertBytesToStr, a, value),
          call(webKit.tryConvertEncoding, a, value, b),
        ])) {
          const { success, error } = $resultShape(result);
          expect(success).toBe("boolean");
          expect(error).not.toContain(SENTINEL);
        }
      }),
      { numRuns: 300 },
    );
  });
});
