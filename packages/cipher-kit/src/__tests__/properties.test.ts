import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import { nodeKit, tryParseToObj, tryStringifyObj, webKit } from "~/export.js";
import { failure, runtimeFailure, secret } from "./__helpers__.js";

// Any code point, without lone surrogates, with half the characters drawn from known edge cases.
const edgeChar = fc.constantFrom("\uFEFF", "\u0000", "\uFFFD", "\u{10FFFF}", " ", ".", "\r\n");
const anyText = fc.string({ unit: fc.oneof(fc.string({ unit: "binary", minLength: 1, maxLength: 1 }), edgeChar) });
const anyValue = fc.anything({
  withNullPrototype: true,
  withBigInt: true,
  withMap: true,
  withSet: true,
  withDate: true,
});
const SENTINEL = "SENTINEL-7f3a";
const hostile = fc.oneof(
  anyValue,
  fc.constant(SENTINEL),
  fc.constant(`${SENTINEL}\uD800`),
  fc.constant([SENTINEL]),
  fc.constant(Object.create(null) as unknown),
);
const optionKeys = fc.constantFrom(
  "additionalData",
  "algorithm",
  "digest",
  "salt",
  "info",
  "inputEncoding",
  "outputEncoding",
  "iterations",
  "keyLength",
  "saltLength",
);

// Additional data as a caller passes it: omitted, a string or bytes, half of them known edge cases.
type Aad = string | Uint8Array | undefined;
const edgeAad = fc.constantFrom<Aad>(
  undefined,
  "",
  new Uint8Array(0),
  "\u0000",
  new Uint8Array([0]),
  ".",
  "user:1",
  "ｕｓｅｒ:1",
  "\u{10FFFF}",
  new Uint8Array([0xff, 0xfe]),
);
const anyAad = fc.oneof(edgeAad, anyText, fc.uint8Array({ maxLength: 64 }));
/** Two AAD values, often the same bytes in another form, so equal and different pairs both come up. */
const aadPair = fc.oneof(
  fc.tuple(anyAad, anyAad),
  anyAad.map((a): [Aad, Aad] => [a, a]),
  anyText.map((t): [Aad, Aad] => [t, new TextEncoder().encode(t)]),
  fc.constantFrom<[Aad, Aad]>(
    ["ｕｓｅｒ:1", "user:1"],
    ["ｕｓｅｒ:1", new TextEncoder().encode("ｕｓｅｒ:1")],
    ["", undefined],
  ),
);

function $aadBytes(a: Aad): Uint8Array {
  return typeof a === "string" ? new TextEncoder().encode(a) : (a ?? new Uint8Array(0));
}

function $sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.byteLength === b.byteLength && a.every((byte, i) => byte === b[i]);
}

function $withAad(a: Aad): { additionalData?: string | Uint8Array } {
  return a === undefined ? {} : { additionalData: a };
}

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

  test("decrypt with additional data returns the data when its bytes equal encrypt's, and fails otherwise", async () => {
    const web = await webKey;
    const nodeAuthFailure = failure(
      "node decrypt: Failed to decrypt data",
      "Unsupported state or unable to authenticate data",
    );
    const webAuthFailure = runtimeFailure("web decrypt: Failed to decrypt data");
    await fc.assert(
      fc.asyncProperty(
        anyText.filter((t) => t !== ""),
        aadPair,
        async (text, [encryptAad, decryptAad]) => {
          const same = $sameBytes($aadBytes(encryptAad), $aadBytes(decryptAad));
          const nodeExpected = same ? { success: true, result: text } : nodeAuthFailure;
          const webExpected = same ? { success: true, result: text } : webAuthFailure;
          for (const encrypted of [
            nodeKit.encrypt(text, nodeKey, $withAad(encryptAad)),
            await webKit.encrypt(text, web, $withAad(encryptAad)),
          ]) {
            expect(nodeKit.tryDecrypt(encrypted, nodeKey, $withAad(decryptAad))).toStrictEqual(nodeExpected);
            expect(await webKit.tryDecrypt(encrypted, web, $withAad(decryptAad))).toStrictEqual(webExpected);
          }
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
