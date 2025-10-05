/** biome-ignore-all lint/suspicious/noTsIgnore: Required for tests */
import { describe, expect, test } from "vitest";
import { matchEncryptedPattern, nodeKit, webKit } from "~/export";
import { data, largeObj, secret, smallObj } from "./__helpers__";

describe("Encryption Tests", () => {
  test("Node: Encrypt", () => {
    const key = nodeKit.createSecretKey(secret);
    const enc = nodeKit.tryEncrypt(data, key);
    expect(enc.success).toBeTruthy();
    expect(enc.error).toBeUndefined();
    expect(enc.result).toBeDefined();
    expect(matchEncryptedPattern(enc.result as string, "node")).toBeTruthy();

    const dec = nodeKit.tryDecrypt(enc.result as string, key);
    expect(dec.success).toBeTruthy();
    expect(dec.error).toBeUndefined();
    expect(dec.result).toBeDefined();
    expect(dec.result).toBe(data);
  });

  test("Web: Encrypt", async () => {
    const key = await webKit.createSecretKey(secret);
    const enc = await webKit.tryEncrypt(data, key);
    expect(enc.success).toBeTruthy();
    expect(enc.error).toBeUndefined();
    expect(enc.result).toBeDefined();
    expect(matchEncryptedPattern(enc.result as string, "web")).toBeTruthy();

    const dec = await webKit.tryDecrypt(enc.result as string, key);
    expect(dec.success).toBeTruthy();
    expect(dec.error).toBeUndefined();
    expect(dec.result).toBeDefined();
    expect(dec.result).toBe(data);
  });

  test("Both: Encrypt to Base64", async () => {
    const nodeKey = nodeKit.createSecretKey(secret);
    const webKey = await webKit.createSecretKey(secret);

    const nodeEnc = nodeKit.encrypt(data, nodeKey, { outputEncoding: "base64" });
    const webEnc = await webKit.encrypt(data, webKey, { outputEncoding: "base64" });

    expect(matchEncryptedPattern(nodeEnc, "node") && matchEncryptedPattern(webEnc, "web")).toBeTruthy();

    const nodeDec = nodeKit.decrypt(nodeEnc, nodeKey, { inputEncoding: "base64" });
    const webDec = await webKit.decrypt(webEnc, webKey, { inputEncoding: "base64" });

    expect(nodeDec).toBe(webDec);
  });

  test("Both: Encrypt to Hex", async () => {
    const nodeKey = nodeKit.createSecretKey(secret);
    const webKey = await webKit.createSecretKey(secret);

    const nodeEnc = nodeKit.encrypt(data, nodeKey, { outputEncoding: "hex" });
    const webEnc = await webKit.encrypt(data, webKey, { outputEncoding: "hex" });

    expect(matchEncryptedPattern(nodeEnc, "node") && matchEncryptedPattern(webEnc, "web")).toBeTruthy();

    const nodeDec = nodeKit.decrypt(nodeEnc, nodeKey, { inputEncoding: "hex" });
    const webDec = await webKit.decrypt(webEnc, webKey, { inputEncoding: "hex" });

    expect(nodeDec).toBe(webDec);
  });

  test("Fail: Encrypt to Base64 not Equal to Hex", async () => {
    const nodeKey = nodeKit.createSecretKey(secret);
    const webKey = await webKit.createSecretKey(secret);

    const nodeEnc = nodeKit.encrypt(data, nodeKey, { outputEncoding: "base64" });
    const webEnc = await webKit.encrypt(data, webKey, { outputEncoding: "base64" });

    expect(matchEncryptedPattern(nodeEnc, "node") && matchEncryptedPattern(webEnc, "web")).toBeTruthy();

    const nodeDec = nodeKit.tryDecrypt(nodeEnc, nodeKey, { inputEncoding: "hex" });
    expect(nodeDec.success).toBeFalsy();
    expect(nodeDec.error).toBeDefined();
    expect(nodeDec.result).toBeUndefined();

    const webDec = await webKit.tryDecrypt(webEnc, webKey, { inputEncoding: "hex" });
    expect(webDec.success).toBeFalsy();
    expect(webDec.error).toBeDefined();
    expect(webDec.result).toBeUndefined();
  });

  test("Node: Encrypt Shouldn't Create Same Ciphertext", () => {
    const key = nodeKit.createSecretKey(secret);
    const enc1 = nodeKit.encrypt(data, key);
    const enc2 = nodeKit.encrypt(data, key);
    expect(enc1).not.toBe(enc2);
  });

  test("Web: Encrypt Shouldn't Create Same Ciphertext", async () => {
    const key = await webKit.createSecretKey(secret);
    const enc1 = await webKit.encrypt(data, key);
    const enc2 = await webKit.encrypt(data, key);
    expect(enc1).not.toBe(enc2);
  });

  test("Node: Encrypt Object", () => {
    const key = nodeKit.createSecretKey(secret);
    const encObj = nodeKit.tryEncryptObj(smallObj, key);
    expect(encObj.success).toBeTruthy();
    expect(encObj.error).toBeUndefined();
    expect(encObj.result).toBeDefined();
    expect(matchEncryptedPattern(encObj.result as string, "node")).toBeTruthy();

    const decObj = nodeKit.tryDecryptObj(encObj.result as string, key);
    expect(decObj.success).toBeTruthy();
    expect(decObj.error).toBeUndefined();
    expect(decObj.result).toBeDefined();
    expect(decObj.result, "Decrypted data does not match original").toEqual(smallObj);

    const encLargeObj = nodeKit.tryEncryptObj(largeObj, key);
    expect(encLargeObj.success).toBeTruthy();
    expect(encLargeObj.error).toBeUndefined();
    expect(encLargeObj.result).toBeDefined();
    expect(matchEncryptedPattern(encLargeObj.result as string, "node")).toBeTruthy();

    const decLargeObj = nodeKit.tryDecryptObj(encLargeObj.result as string, key);
    expect(decLargeObj.success).toBeTruthy();
    expect(decLargeObj.error).toBeUndefined();
    expect(decLargeObj.result).toBeDefined();
    expect(decLargeObj.result).toEqual(largeObj);
  });

  test("Web: Encrypt Object", async () => {
    const key = await webKit.createSecretKey(secret);
    const encObj = await webKit.tryEncryptObj(smallObj, key);
    expect(encObj.success).toBeTruthy();
    expect(encObj.error).toBeUndefined();
    expect(encObj.result).toBeDefined();
    expect(matchEncryptedPattern(encObj.result as string, "web")).toBeTruthy();

    const decObj = await webKit.tryDecryptObj(encObj.result as string, key);
    expect(decObj.success).toBeTruthy();
    expect(decObj.error).toBeUndefined();
    expect(decObj.result).toBeDefined();
    expect(decObj.result).toEqual(smallObj);

    const encLargeObj = await webKit.tryEncryptObj(largeObj, key);
    expect(encLargeObj.success).toBeTruthy();
    expect(encLargeObj.error).toBeUndefined();
    expect(encLargeObj.result).toBeDefined();
    expect(matchEncryptedPattern(encLargeObj.result as string, "web")).toBeTruthy();

    const decLargeObj = await webKit.tryDecryptObj(encLargeObj.result as string, key);
    expect(decLargeObj.success).toBeTruthy();
    expect(decLargeObj.error).toBeUndefined();
    expect(decLargeObj.result).toBeDefined();
    expect(decLargeObj.result).toEqual(largeObj);
  });

  test("Fail: Encrypt with Wrong Options type", async () => {
    const nodeKey = nodeKit.createSecretKey(secret);
    const webKey = await webKit.createSecretKey(secret);

    // @ts-ignore
    const nodeEnc = nodeKit.tryEncrypt(data, nodeKey, 3.14);
    expect(nodeEnc.success).toBeFalsy();
    expect(nodeEnc.error).toBeDefined();
    expect(nodeEnc.result).toBeUndefined();

    // @ts-ignore
    const webEnc = await webKit.tryEncrypt(data, webKey, 3.14);
    expect(webEnc.success).toBeFalsy();
    expect(webEnc.error).toBeDefined();
    expect(webEnc.result).toBeUndefined();
  });

  test("Fail: Decrypt with Wrong Options type", async () => {
    const nodeKey = nodeKit.createSecretKey(secret);
    const webKey = await webKit.createSecretKey(secret);

    const nodeEnc = nodeKit.encrypt(data, nodeKey);
    const webEnc = await webKit.encrypt(data, webKey);

    // @ts-ignore
    const nodeDec = nodeKit.tryDecrypt(nodeEnc, nodeKey, 3.14);
    expect(nodeDec.success).toBeFalsy();
    expect(nodeDec.error).toBeDefined();
    expect(nodeDec.result).toBeUndefined();

    // @ts-ignore
    const webDec = await webKit.tryDecrypt(webEnc, webKey, 3.14);
    expect(webDec.success).toBeFalsy();
    expect(webDec.error).toBeDefined();
    expect(webDec.result).toBeUndefined();
  });

  test("Fail: Encrypt with Invalid Options", async () => {
    const nodeKey = nodeKit.createSecretKey(secret);
    const webKey = await webKit.createSecretKey(secret);

    // @ts-ignore
    const nodeEnc = nodeKit.tryEncrypt(data, nodeKey, { outputEncoding: "invalid-encoding" });
    expect(nodeEnc.success).toBeFalsy();
    expect(nodeEnc.error).toBeDefined();
    expect(nodeEnc.result).toBeUndefined();

    // @ts-ignore
    const webEnc = await webKit.tryEncrypt(data, webKey, { outputEncoding: "invalid-encoding" });
    expect(webEnc.success).toBeFalsy();
    expect(webEnc.error).toBeDefined();
    expect(webEnc.result).toBeUndefined();
  });

  test("Fail: Decrypt with Invalid Options", async () => {
    const nodeKey = nodeKit.createSecretKey(secret);
    const webKey = await webKit.createSecretKey(secret);

    const nodeEnc = nodeKit.encrypt(data, nodeKey);
    const webEnc = await webKit.encrypt(data, webKey);

    // @ts-ignore
    const nodeDec = nodeKit.tryDecrypt(nodeEnc, nodeKey, { inputEncoding: "invalid-encoding" });
    expect(nodeDec.success).toBeFalsy();
    expect(nodeDec.error).toBeDefined();
    expect(nodeDec.result).toBeUndefined();

    // @ts-ignore
    const webDec = await webKit.tryDecrypt(webEnc, webKey, { inputEncoding: "invalid-encoding" });
    expect(webDec.success).toBeFalsy();
    expect(webDec.error).toBeDefined();
    expect(webDec.result).toBeUndefined();
  });

  test("Fail: Decrypt with Wrong Key", async () => {
    const nodeKey1 = nodeKit.createSecretKey(secret);
    const nodeKey2 = nodeKit.createSecretKey(`${secret}!`);
    const webKey1 = await webKit.createSecretKey(secret);
    const webKey2 = await webKit.createSecretKey(`${secret}!`);

    const nodeEnc = nodeKit.encrypt(data, nodeKey1);
    const webEnc = await webKit.encrypt(data, webKey1);

    const nodeDec = nodeKit.tryDecrypt(nodeEnc, nodeKey2);
    expect(nodeDec.success).toBeFalsy();
    expect(nodeDec.error).toBeDefined();
    expect(nodeDec.result).toBeUndefined();

    const webDec = await webKit.tryDecrypt(webEnc, webKey2);
    expect(webDec.success).toBeFalsy();
    expect(webDec.error).toBeDefined();
    expect(webDec.result).toBeUndefined();
  });

  test("Fail: Decrypt with Wrong Key Algorithm", async () => {
    const nodeKey1 = nodeKit.createSecretKey(secret, { algorithm: "aes256gcm" });
    const nodeKey2 = nodeKit.createSecretKey(secret, { algorithm: "aes128gcm" });
    const webKey1 = await webKit.createSecretKey(secret, { algorithm: "aes256gcm" });
    const webKey2 = await webKit.createSecretKey(secret, { algorithm: "aes128gcm" });

    const nodeEnc = nodeKit.encrypt(data, nodeKey1);
    const webEnc = await webKit.encrypt(data, webKey1);

    const nodeDec = nodeKit.tryDecrypt(nodeEnc, nodeKey2);
    expect(nodeDec.success).toBeFalsy();
    expect(nodeDec.error).toBeDefined();
    expect(nodeDec.result).toBeUndefined();

    const webDec = await webKit.tryDecrypt(webEnc, webKey2);
    expect(webDec.success).toBeFalsy();
    expect(webDec.error).toBeDefined();
    expect(webDec.result).toBeUndefined();
  });

  test("Fail: Decrypt with Wrong Derived Key", async () => {
    const nodeKey1 = nodeKit.createSecretKey(secret, { digest: "sha256" });
    const nodeKey2 = nodeKit.createSecretKey(secret, { digest: "sha512" });
    const webKey1 = await webKit.createSecretKey(secret, { digest: "sha256" });
    const webKey2 = await webKit.createSecretKey(secret, { digest: "sha512" });

    const nodeEnc = nodeKit.encrypt(data, nodeKey1);
    const webEnc = await webKit.encrypt(data, webKey1);

    const nodeDec = nodeKit.tryDecrypt(nodeEnc, nodeKey2);
    expect(nodeDec.success).toBeFalsy();
    expect(nodeDec.error).toBeDefined();
    expect(nodeDec.result).toBeUndefined();

    const webDec = await webKit.tryDecrypt(webEnc, webKey2);
    expect(webDec.success).toBeFalsy();
    expect(webDec.error).toBeDefined();
    expect(webDec.result).toBeUndefined();
  });
});
