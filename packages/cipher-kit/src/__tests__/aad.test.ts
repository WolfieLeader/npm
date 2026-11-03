import { Buffer } from "node:buffer";
import { describe, expect, test } from "vitest";
import { nodeKit, webKit } from "~/export.js";
import type { DecryptOptions, EncryptOptions } from "~/export.js";
import { aad } from "./__aad-fixtures__.js";
import { v3 } from "./__v3-fixtures__.js";
import { cipherPattern, data, failure, runtimeFailure, secret, smallObj, stringMatching } from "./__helpers__.js";

const NODE_AUTH_FAILURE = failure(
  "node decrypt: Failed to decrypt data",
  "Unsupported state or unable to authenticate data",
);
const WEB_AUTH_FAILURE = runtimeFailure("web decrypt: Failed to decrypt data");
const RECORD = "record:42";

const nodeKey = nodeKit.createSecretKey(secret);
const webKeyPromise = webKit.createSecretKey(secret);

describe("AES-GCM additional data", () => {
  test("Node: round trip with string and byte additional data", () => {
    for (const additionalData of [RECORD, new Uint8Array([0, 255, 7]), Buffer.from("buffer-aad")]) {
      const enc = nodeKit.tryEncrypt(data, nodeKey, { additionalData });
      expect(enc).toStrictEqual({ success: true, result: stringMatching(cipherPattern(data)) });
      expect(nodeKit.tryDecrypt(enc.result as string, nodeKey, { additionalData })).toStrictEqual({
        success: true,
        result: data,
      });
    }
  });

  test("Web: round trip with string and byte additional data", async () => {
    const webKey = await webKeyPromise;
    for (const additionalData of [RECORD, new Uint8Array([0, 255, 7])]) {
      const enc = await webKit.tryEncrypt(data, webKey, { additionalData });
      expect(enc).toStrictEqual({ success: true, result: stringMatching(cipherPattern(data)) });
      expect(await webKit.tryDecrypt(enc.result as string, webKey, { additionalData })).toStrictEqual({
        success: true,
        result: data,
      });
    }
  });

  test("Both: encryptObj and decryptObj pass additional data through", async () => {
    const webKey = await webKeyPromise;
    const options = { additionalData: RECORD };

    const nodeEnc = nodeKit.encryptObj(smallObj, nodeKey, options);
    expect(nodeKit.decryptObj(nodeEnc, nodeKey, options)).toStrictEqual(smallObj);
    expect(nodeKit.tryDecryptObj(nodeEnc, nodeKey)).toStrictEqual(NODE_AUTH_FAILURE);

    const webEnc = await webKit.encryptObj(smallObj, webKey, options);
    expect(await webKit.decryptObj(webEnc, webKey, options)).toStrictEqual(smallObj);
    expect(await webKit.tryDecryptObj(webEnc, webKey)).toStrictEqual(WEB_AUTH_FAILURE);
  });

  test("Cross-platform: Node and Web each decrypt the other's output with additional data", async () => {
    const webKey = await webKeyPromise;
    for (const encoding of ["base64url", "base64", "hex"] as const) {
      for (const additionalData of [RECORD, new Uint8Array([1, 2, 3])]) {
        const nodeEnc = nodeKit.encrypt(data, nodeKey, { additionalData, outputEncoding: encoding });
        expect(await webKit.decrypt(nodeEnc, webKey, { additionalData, inputEncoding: encoding })).toBe(data);

        const webEnc = await webKit.encrypt(data, webKey, { additionalData, outputEncoding: encoding });
        expect(nodeKit.decrypt(webEnc, nodeKey, { additionalData, inputEncoding: encoding })).toBe(data);
      }
    }
  });

  test("Cross-platform: wrong or missing additional data fails on both kits", async () => {
    const webKey = await webKeyPromise;
    for (const encrypted of [
      nodeKit.encrypt(data, nodeKey, { additionalData: RECORD }),
      await webKit.encrypt(data, webKey, { additionalData: RECORD }),
    ]) {
      for (const options of [{ additionalData: "record:43" }, { additionalData: new Uint8Array([1]) }, {}]) {
        expect(nodeKit.tryDecrypt(encrypted, nodeKey, options)).toStrictEqual(NODE_AUTH_FAILURE);
        expect(await webKit.tryDecrypt(encrypted, webKey, options)).toStrictEqual(WEB_AUTH_FAILURE);
      }
    }
  });

  test("Cross-platform: additional data given only at decrypt fails on both kits", async () => {
    const webKey = await webKeyPromise;
    for (const encrypted of [nodeKit.encrypt(data, nodeKey), await webKit.encrypt(data, webKey)]) {
      expect(nodeKit.tryDecrypt(encrypted, nodeKey, { additionalData: RECORD })).toStrictEqual(NODE_AUTH_FAILURE);
      expect(await webKit.tryDecrypt(encrypted, webKey, { additionalData: RECORD })).toStrictEqual(WEB_AUTH_FAILURE);
    }
  });

  test("throwing decrypt rejects a ciphertext moved to another record", async () => {
    const webKey = await webKeyPromise;
    const enc = nodeKit.encrypt(data, nodeKey, { additionalData: "user:1" });
    expect(() => nodeKit.decrypt(enc, nodeKey, { additionalData: "user:2" })).toThrow(
      "node decrypt: Failed to decrypt data - Unsupported state or unable to authenticate data",
    );
    await expect(webKit.decrypt(enc, webKey, { additionalData: "user:2" })).rejects.toThrow(
      "web decrypt: Failed to decrypt data",
    );
  });

  test("a string and its UTF-8 bytes are the same additional data", async () => {
    const webKey = await webKeyPromise;
    const text = "ｕｓｅｒ:日本:🦊";
    const enc = nodeKit.encrypt(data, nodeKey, { additionalData: text });
    expect(nodeKit.decrypt(enc, nodeKey, { additionalData: new TextEncoder().encode(text) })).toBe(data);
    expect(await webKit.decrypt(enc, webKey, { additionalData: new TextEncoder().encode(text) })).toBe(data);
  });

  test("a subarray view binds only its own bytes, and a Buffer works on Web too", async () => {
    const webKey = await webKeyPromise;
    const view = new Uint8Array([9, 9, 1, 2, 3, 9]).subarray(2, 5);
    const exact = new Uint8Array([1, 2, 3]);

    const fromNode = nodeKit.encrypt(data, nodeKey, { additionalData: view });
    expect(await webKit.decrypt(fromNode, webKey, { additionalData: exact })).toBe(data);
    const fromWeb = await webKit.encrypt(data, webKey, { additionalData: view });
    expect(nodeKit.decrypt(fromWeb, nodeKey, { additionalData: exact })).toBe(data);

    const fromBuffer = await webKit.encrypt(data, webKey, { additionalData: Buffer.from("user:1") });
    expect(nodeKit.decrypt(fromBuffer, nodeKey, { additionalData: "user:1" })).toBe(data);
  });

  test("Fail: a Uint8Array over a detached buffer fails instead of counting as empty", async () => {
    const webKey = await webKeyPromise;
    const enc = nodeKit.encrypt(data, nodeKey);
    const detached = new Uint8Array([1, 2, 3]);
    structuredClone(detached.buffer, { transfer: [detached.buffer] });
    const options = { additionalData: detached };
    const description = "An unexpected TypeError was thrown internally";

    expect(nodeKit.tryEncrypt(data, nodeKey, options)).toStrictEqual(
      failure("node encrypt: Unexpected error", description),
    );
    expect(nodeKit.tryDecrypt(enc, nodeKey, options)).toStrictEqual(
      failure("node decrypt: Unexpected error", description),
    );
    expect(await webKit.tryEncrypt(data, webKey, options)).toStrictEqual(
      failure("web encrypt: Unexpected error", description),
    );
    expect(await webKit.tryDecrypt(enc, webKey, options)).toStrictEqual(
      failure("web decrypt: Unexpected error", description),
    );
  });

  test("a string is not NFKC-normalized, so its compatibility form is different additional data", async () => {
    const webKey = await webKeyPromise;
    const enc = nodeKit.encrypt(data, nodeKey, { additionalData: "ｕｓｅｒ:1" });
    expect(nodeKit.tryDecrypt(enc, nodeKey, { additionalData: "user:1" })).toStrictEqual(NODE_AUTH_FAILURE);
    expect(await webKit.tryDecrypt(enc, webKey, { additionalData: "user:1" })).toStrictEqual(WEB_AUTH_FAILURE);
  });

  test("empty additional data is the same as none, because AES-GCM authenticates them identically", async () => {
    const webKey = await webKeyPromise;
    const empties: (EncryptOptions & DecryptOptions)[] = [
      {},
      { additionalData: "" },
      { additionalData: new Uint8Array(0) },
    ];
    for (const encryptOptions of empties) {
      const fromNode = nodeKit.encrypt(data, nodeKey, encryptOptions);
      const fromWeb = await webKit.encrypt(data, webKey, encryptOptions);
      for (const decryptOptions of empties) {
        for (const encrypted of [fromNode, fromWeb]) {
          expect(nodeKit.decrypt(encrypted, nodeKey, decryptOptions)).toBe(data);
          expect(await webKit.decrypt(encrypted, webKey, decryptOptions)).toBe(data);
        }
      }
    }
  });

  test("ciphertexts written before additional data existed decrypt with empty additional data", async () => {
    const { ciphertext, encoding } = v3.ciphertexts[0] as (typeof v3.ciphertexts)[number];
    const key = nodeKit.createSecretKey(v3.secret);
    const webKey = await webKit.createSecretKey(v3.secret);
    for (const additionalData of ["", new Uint8Array(0)]) {
      expect(nodeKit.decrypt(ciphertext, key, { inputEncoding: encoding, additionalData })).toBe(v3.text);
      expect(await webKit.decrypt(ciphertext, webKey, { inputEncoding: encoding, additionalData })).toBe(v3.text);
    }
  });

  test("Fail: additional data that is not a string or Uint8Array", async () => {
    const webKey = await webKeyPromise;
    const enc = nodeKit.encrypt(data, nodeKey);
    const description = "Received another type, or a string with lone UTF-16 surrogates";
    for (const additionalData of [42, null, new ArrayBuffer(4), new Uint16Array(2), [1, 2], "\uD800"]) {
      const options = { additionalData } as unknown as EncryptOptions & DecryptOptions;
      expect(nodeKit.tryEncrypt(data, nodeKey, options)).toStrictEqual(
        failure("node encrypt: Additional data must be a string or Uint8Array", description),
      );
      expect(nodeKit.tryDecrypt(enc, nodeKey, options)).toStrictEqual(
        failure("node decrypt: Additional data must be a string or Uint8Array", description),
      );
      expect(await webKit.tryEncrypt(data, webKey, options)).toStrictEqual(
        failure("web encrypt: Additional data must be a string or Uint8Array", description),
      );
      expect(await webKit.tryDecrypt(enc, webKey, options)).toStrictEqual(
        failure("web decrypt: Additional data must be a string or Uint8Array", description),
      );
    }
  });

  test("Fail: additional data above 65,536 bytes, measuring strings in UTF-8 bytes, not UTF-16 units", async () => {
    const webKey = await webKeyPromise;
    const enc = nodeKit.encrypt(data, nodeKey);
    const description = "Strings are measured in UTF-8 bytes; use at most 65536";
    for (const additionalData of [new Uint8Array(65_537), "a".repeat(65_537), "日".repeat(21_846)]) {
      const options = { additionalData };
      expect(nodeKit.tryEncrypt(data, nodeKey, options)).toStrictEqual(
        failure("node encrypt: Additional data must be at most 65536 bytes", description),
      );
      expect(nodeKit.tryDecrypt(enc, nodeKey, options)).toStrictEqual(
        failure("node decrypt: Additional data must be at most 65536 bytes", description),
      );
      expect(await webKit.tryEncrypt(data, webKey, options)).toStrictEqual(
        failure("web encrypt: Additional data must be at most 65536 bytes", description),
      );
      expect(await webKit.tryDecrypt(enc, webKey, options)).toStrictEqual(
        failure("web decrypt: Additional data must be at most 65536 bytes", description),
      );
    }
  });

  test("exactly 65,536 bytes of additional data round-trips between Node and Web", async () => {
    const webKey = await webKeyPromise;
    const additionalData = new Uint8Array(65_536).fill(7);
    const enc = nodeKit.encrypt(data, nodeKey, { additionalData });
    expect(await webKit.decrypt(enc, webKey, { additionalData })).toBe(data);
  });
});

// A failure here means ciphertexts users stored with additional data stop decrypting.
describe("Reads what cipher-kit 4.2.0 wrote with additional data", () => {
  for (const { name, key, encoding, additionalData, ciphertext } of aad.ciphertexts) {
    test(`decrypts a 4.2.0 ciphertext (${name}) on Node and Web, and only with its additional data`, async () => {
      const nodeK = nodeKit.createSecretKey(aad.secret, key);
      const webK = await webKit.createSecretKey(aad.secret, key);
      const options = { inputEncoding: encoding, additionalData };
      expect(nodeKit.decrypt(ciphertext, nodeK, options)).toBe(aad.text);
      expect(await webKit.decrypt(ciphertext, webK, options)).toBe(aad.text);

      for (const wrong of [{ inputEncoding: encoding }, { inputEncoding: encoding, additionalData: "other" }]) {
        expect(nodeKit.tryDecrypt(ciphertext, nodeK, wrong)).toStrictEqual(NODE_AUTH_FAILURE);
        expect(await webKit.tryDecrypt(ciphertext, webK, wrong)).toStrictEqual(WEB_AUTH_FAILURE);
      }
    });
  }

  test("decrypts a 4.2.0 object on Node and Web, and only with its additional data", async () => {
    const { additionalData, ciphertext } = aad.objectCiphertext;
    const nodeK = nodeKit.createSecretKey(aad.secret);
    const webK = await webKit.createSecretKey(aad.secret);
    expect(nodeKit.decryptObj(ciphertext, nodeK, { additionalData })).toStrictEqual(aad.object);
    expect(await webKit.decryptObj(ciphertext, webK, { additionalData })).toStrictEqual(aad.object);
    expect(nodeKit.tryDecryptObj(ciphertext, nodeK)).toStrictEqual(NODE_AUTH_FAILURE);
    expect(await webKit.tryDecryptObj(ciphertext, webK)).toStrictEqual(WEB_AUTH_FAILURE);
  });
});
