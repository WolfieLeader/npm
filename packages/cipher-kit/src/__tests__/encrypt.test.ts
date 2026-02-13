/** biome-ignore-all lint/suspicious/noTsIgnore: Required for tests */
import { describe, expect, test } from "vitest";
import { matchEncryptedPattern, nodeKit, webKit } from "~/export.js";
import { data, largeObj, secret, smallObj } from "./__helpers__.js";

function $flipByte(segment: string): string {
  const chars = [...segment];
  const idx = Math.min(1, chars.length - 1);
  const c = chars[idx] as string;
  chars[idx] = c === "A" ? "B" : "A";
  return chars.join("");
}

describe("Encryption Tests", () => {
  test("Node: Encrypt", () => {
    const key = nodeKit.createSecretKey(secret);
    const enc = nodeKit.tryEncrypt(data, key);
    expect(enc.success).toBeTruthy();
    expect(enc.error).toBeUndefined();
    expect(enc.result).toBeDefined();
    expect(matchEncryptedPattern(enc.result as string)).toBeTruthy();

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
    expect(matchEncryptedPattern(enc.result as string)).toBeTruthy();

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

    expect(matchEncryptedPattern(nodeEnc) && matchEncryptedPattern(webEnc)).toBeTruthy();

    const nodeDec = nodeKit.decrypt(nodeEnc, nodeKey, { inputEncoding: "base64" });
    const webDec = await webKit.decrypt(webEnc, webKey, { inputEncoding: "base64" });

    expect(nodeDec).toBe(webDec);
  });

  test("Both: Encrypt to Hex", async () => {
    const nodeKey = nodeKit.createSecretKey(secret);
    const webKey = await webKit.createSecretKey(secret);

    const nodeEnc = nodeKit.encrypt(data, nodeKey, { outputEncoding: "hex" });
    const webEnc = await webKit.encrypt(data, webKey, { outputEncoding: "hex" });

    expect(matchEncryptedPattern(nodeEnc) && matchEncryptedPattern(webEnc)).toBeTruthy();

    const nodeDec = nodeKit.decrypt(nodeEnc, nodeKey, { inputEncoding: "hex" });
    const webDec = await webKit.decrypt(webEnc, webKey, { inputEncoding: "hex" });

    expect(nodeDec).toBe(webDec);
  });

  test("Both: AES-128-GCM round trip", async () => {
    const nodeKey = nodeKit.createSecretKey(secret, { algorithm: "aes128gcm" });
    const webKey = await webKit.createSecretKey(secret, { algorithm: "aes128gcm" });

    const nodeEnc = nodeKit.encrypt(data, nodeKey);
    const nodeDec = nodeKit.decrypt(nodeEnc, nodeKey);
    expect(nodeDec).toBe(data);

    const webEnc = await webKit.encrypt(data, webKey);
    const webDec = await webKit.decrypt(webEnc, webKey);
    expect(webDec).toBe(data);
  });

  test("Both: AES-192-GCM round trip", async () => {
    const nodeKey = nodeKit.createSecretKey(secret, { algorithm: "aes192gcm" });
    const webKey = await webKit.createSecretKey(secret, { algorithm: "aes192gcm" });

    const nodeEnc = nodeKit.encrypt(data, nodeKey);
    const nodeDec = nodeKit.decrypt(nodeEnc, nodeKey);
    expect(nodeDec).toBe(data);

    const webEnc = await webKit.encrypt(data, webKey);
    const webDec = await webKit.decrypt(webEnc, webKey);
    expect(webDec).toBe(data);
  });

  test("Fail: Encrypt to Base64 not Equal to Hex", async () => {
    const nodeKey = nodeKit.createSecretKey(secret);
    const webKey = await webKit.createSecretKey(secret);

    const nodeEnc = nodeKit.encrypt(data, nodeKey, { outputEncoding: "base64" });
    const webEnc = await webKit.encrypt(data, webKey, { outputEncoding: "base64" });

    expect(matchEncryptedPattern(nodeEnc) && matchEncryptedPattern(webEnc)).toBeTruthy();

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
    expect(matchEncryptedPattern(encObj.result as string)).toBeTruthy();

    const decObj = nodeKit.tryDecryptObj(encObj.result as string, key);
    expect(decObj.success).toBeTruthy();
    expect(decObj.error).toBeUndefined();
    expect(decObj.result).toBeDefined();
    expect(decObj.result, "Decrypted data does not match original").toEqual(smallObj);

    const encLargeObj = nodeKit.tryEncryptObj(largeObj, key);
    expect(encLargeObj.success).toBeTruthy();
    expect(encLargeObj.error).toBeUndefined();
    expect(encLargeObj.result).toBeDefined();
    expect(matchEncryptedPattern(encLargeObj.result as string)).toBeTruthy();

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
    expect(matchEncryptedPattern(encObj.result as string)).toBeTruthy();

    const decObj = await webKit.tryDecryptObj(encObj.result as string, key);
    expect(decObj.success).toBeTruthy();
    expect(decObj.error).toBeUndefined();
    expect(decObj.result).toBeDefined();
    expect(decObj.result).toEqual(smallObj);

    const encLargeObj = await webKit.tryEncryptObj(largeObj, key);
    expect(encLargeObj.success).toBeTruthy();
    expect(encLargeObj.error).toBeUndefined();
    expect(encLargeObj.result).toBeDefined();
    expect(matchEncryptedPattern(encLargeObj.result as string)).toBeTruthy();

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

  test("Cross-platform: Node encrypt → Web decrypt", async () => {
    const nodeKey = nodeKit.createSecretKey(secret);
    const webKey = await webKit.createSecretKey(secret);

    const encrypted = nodeKit.encrypt(data, nodeKey);
    expect(matchEncryptedPattern(encrypted)).toBeTruthy();

    const decrypted = await webKit.decrypt(encrypted, webKey);
    expect(decrypted).toBe(data);
  });

  test("Cross-platform: Web encrypt → Node decrypt", async () => {
    const nodeKey = nodeKit.createSecretKey(secret);
    const webKey = await webKit.createSecretKey(secret);

    const encrypted = await webKit.encrypt(data, webKey);
    expect(matchEncryptedPattern(encrypted)).toBeTruthy();

    const decrypted = nodeKit.decrypt(encrypted, nodeKey);
    expect(decrypted).toBe(data);
  });

  test("Cross-platform: round trip with all encodings", async () => {
    const encodings = ["base64", "base64url", "hex"] as const;

    for (const encoding of encodings) {
      const nodeKey = nodeKit.createSecretKey(secret);
      const webKey = await webKit.createSecretKey(secret);

      const nodeEnc = nodeKit.encrypt(data, nodeKey, { outputEncoding: encoding });
      const webDec = await webKit.decrypt(nodeEnc, webKey, { inputEncoding: encoding });
      expect(webDec, `Node→Web failed for ${encoding}`).toBe(data);

      const webEnc = await webKit.encrypt(data, webKey, { outputEncoding: encoding });
      const nodeDec = nodeKit.decrypt(webEnc, nodeKey, { inputEncoding: encoding });
      expect(nodeDec, `Web→Node failed for ${encoding}`).toBe(data);
    }
  });

  test("Cross-platform: round trip with AES-128-GCM and AES-192-GCM", async () => {
    for (const algorithm of ["aes128gcm", "aes192gcm"] as const) {
      const nodeKey = nodeKit.createSecretKey(secret, { algorithm });
      const webKey = await webKit.createSecretKey(secret, { algorithm });

      const nodeEnc = nodeKit.encrypt(data, nodeKey);
      const webDec = await webKit.decrypt(nodeEnc, webKey);
      expect(webDec, `Node→Web failed for ${algorithm}`).toBe(data);

      const webEnc = await webKit.encrypt(data, webKey);
      const nodeDec = nodeKit.decrypt(webEnc, nodeKey);
      expect(nodeDec, `Web→Node failed for ${algorithm}`).toBe(data);
    }
  });

  test("Node: tampered IV rejected", () => {
    const key = nodeKit.createSecretKey(secret);
    const enc = nodeKit.encrypt(data, key);
    const [iv, cipher, tag] = enc.split(".", 4) as [string, string, string];
    const tampered = `${$flipByte(iv)}.${cipher}.${tag}.`;
    const result = nodeKit.tryDecrypt(tampered, key);
    expect(result.success).toBe(false);
  });

  test("Node: tampered ciphertext rejected", () => {
    const key = nodeKit.createSecretKey(secret);
    const enc = nodeKit.encrypt(data, key);
    const [iv, cipher, tag] = enc.split(".", 4) as [string, string, string];
    const tampered = `${iv}.${$flipByte(cipher)}.${tag}.`;
    const result = nodeKit.tryDecrypt(tampered, key);
    expect(result.success).toBe(false);
  });

  test("Node: tampered auth tag rejected", () => {
    const key = nodeKit.createSecretKey(secret);
    const enc = nodeKit.encrypt(data, key);
    const [iv, cipher, tag] = enc.split(".", 4) as [string, string, string];
    const tampered = `${iv}.${cipher}.${$flipByte(tag)}.`;
    const result = nodeKit.tryDecrypt(tampered, key);
    expect(result.success).toBe(false);
  });

  test("Node: truncated ciphertext rejected", () => {
    const key = nodeKit.createSecretKey(secret);
    const enc = nodeKit.encrypt(data, key);
    const [iv, cipher, tag] = enc.split(".", 4) as [string, string, string];
    const truncated = `${iv}.${cipher.slice(0, Math.max(1, cipher.length - 2))}.${tag}.`;
    const result = nodeKit.tryDecrypt(truncated, key);
    expect(result.success).toBe(false);
  });

  test("Web: tampered IV rejected", async () => {
    const key = await webKit.createSecretKey(secret);
    const enc = await webKit.encrypt(data, key);
    const [iv, cipher, tag] = enc.split(".", 4) as [string, string, string];
    const tampered = `${$flipByte(iv)}.${cipher}.${tag}.`;
    const result = await webKit.tryDecrypt(tampered, key);
    expect(result.success).toBe(false);
  });

  test("Web: tampered ciphertext rejected", async () => {
    const key = await webKit.createSecretKey(secret);
    const enc = await webKit.encrypt(data, key);
    const [iv, cipher, tag] = enc.split(".", 4) as [string, string, string];
    const tampered = `${iv}.${$flipByte(cipher)}.${tag}.`;
    const result = await webKit.tryDecrypt(tampered, key);
    expect(result.success).toBe(false);
  });

  test("Web: tampered auth tag rejected", async () => {
    const key = await webKit.createSecretKey(secret);
    const enc = await webKit.encrypt(data, key);
    const [iv, cipher, tag] = enc.split(".", 4) as [string, string, string];
    const tampered = `${iv}.${cipher}.${$flipByte(tag)}.`;
    const result = await webKit.tryDecrypt(tampered, key);
    expect(result.success).toBe(false);
  });

  test("Web: truncated ciphertext rejected", async () => {
    const key = await webKit.createSecretKey(secret);
    const enc = await webKit.encrypt(data, key);
    const [iv, cipher, tag] = enc.split(".", 4) as [string, string, string];
    const truncated = `${iv}.${cipher.slice(0, Math.max(1, cipher.length - 2))}.${tag}.`;
    const result = await webKit.tryDecrypt(truncated, key);
    expect(result.success).toBe(false);
  });
});
