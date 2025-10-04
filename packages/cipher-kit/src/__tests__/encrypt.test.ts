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
});

// TODO: encoding, algo, options variations and options invalid type and cases
