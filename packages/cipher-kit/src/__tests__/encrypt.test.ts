import { describe, expect, test } from "vitest";
import { matchEncryptedPattern, nodeKit, webKit } from "~/export.js";
import {
  cipherPattern,
  data,
  failure,
  lacksNodeAes192,
  largeObj,
  runtimeFailure,
  secret,
  smallObj,
  stringMatching,
} from "./__helpers__.js";

/** Replaces the second character of an ASCII (base64, base64url or hex) segment with a different one. */
function $flipByte(segment: string): string {
  const idx = Math.min(1, segment.length - 1);
  const replacement = segment.charAt(idx) === "A" ? "B" : "A";
  return `${segment.slice(0, idx)}${replacement}${segment.slice(idx + 1)}`;
}

const smallJson = JSON.stringify(smallObj);
const largeJson = JSON.stringify(largeObj);

describe("Encryption Tests", () => {
  test("Node: Encrypt", () => {
    const key = nodeKit.createSecretKey(secret);
    const enc = nodeKit.tryEncrypt(data, key);
    expect(enc).toStrictEqual({ success: true, result: stringMatching(cipherPattern(data)) });
    expect(matchEncryptedPattern(enc.result as string)).toBe(true);

    const dec = nodeKit.tryDecrypt(enc.result as string, key);
    expect(dec).toStrictEqual({ success: true, result: data });
    expect(dec.result).toBe(data);
  });

  test("Web: Encrypt", async () => {
    const key = await webKit.createSecretKey(secret);
    const enc = await webKit.tryEncrypt(data, key);
    expect(enc).toStrictEqual({ success: true, result: stringMatching(cipherPattern(data)) });
    expect(matchEncryptedPattern(enc.result as string)).toBe(true);

    const dec = await webKit.tryDecrypt(enc.result as string, key);
    expect(dec).toStrictEqual({ success: true, result: data });
    expect(dec.result).toBe(data);
  });

  test("Both: Encrypt to Base64", async () => {
    const nodeKey = nodeKit.createSecretKey(secret);
    const webKey = await webKit.createSecretKey(secret);

    const nodeEnc = nodeKit.encrypt(data, nodeKey, { outputEncoding: "base64" });
    const webEnc = await webKit.encrypt(data, webKey, { outputEncoding: "base64" });

    expect(nodeEnc).toMatch(cipherPattern(data, "base64"));
    expect(webEnc).toMatch(cipherPattern(data, "base64"));
    expect(matchEncryptedPattern(nodeEnc) && matchEncryptedPattern(webEnc)).toBe(true);

    const nodeDec = nodeKit.decrypt(nodeEnc, nodeKey, { inputEncoding: "base64" });
    const webDec = await webKit.decrypt(webEnc, webKey, { inputEncoding: "base64" });

    expect(nodeDec).toBe(webDec);
  });

  test("Both: Encrypt to Hex", async () => {
    const nodeKey = nodeKit.createSecretKey(secret);
    const webKey = await webKit.createSecretKey(secret);

    const nodeEnc = nodeKit.encrypt(data, nodeKey, { outputEncoding: "hex" });
    const webEnc = await webKit.encrypt(data, webKey, { outputEncoding: "hex" });

    expect(nodeEnc).toMatch(cipherPattern(data, "hex"));
    expect(webEnc).toMatch(cipherPattern(data, "hex"));
    expect(matchEncryptedPattern(nodeEnc) && matchEncryptedPattern(webEnc)).toBe(true);

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

  test.skipIf(lacksNodeAes192)("Both: AES-192-GCM round trip", async () => {
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

    expect(nodeEnc).toMatch(cipherPattern(data, "base64"));
    expect(webEnc).toMatch(cipherPattern(data, "base64"));
    expect(matchEncryptedPattern(nodeEnc) && matchEncryptedPattern(webEnc)).toBe(true);

    const nodeDec = nodeKit.tryDecrypt(nodeEnc, nodeKey, { inputEncoding: "hex" });
    expect(nodeDec).toStrictEqual(
      failure(
        "node decrypt: Failed to decode input",
        "Conversion error: node strToBytes: Failed to convert data - Invalid hex string",
      ),
    );

    const webDec = await webKit.tryDecrypt(webEnc, webKey, { inputEncoding: "hex" });
    expect(webDec).toStrictEqual(
      failure(
        "web decrypt: Failed to decode input",
        "Conversion error: web strToBytes: Failed to convert data - Invalid hex string",
      ),
    );
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
    expect(encObj).toStrictEqual({ success: true, result: stringMatching(cipherPattern(smallJson)) });
    expect(matchEncryptedPattern(encObj.result as string)).toBe(true);

    const decObj = nodeKit.tryDecryptObj(encObj.result as string, key);
    expect(decObj).toStrictEqual({ success: true, result: smallObj });
    expect(decObj.result, "Decrypted data does not match original").toStrictEqual(smallObj);

    const encLargeObj = nodeKit.tryEncryptObj(largeObj, key);
    expect(encLargeObj).toStrictEqual({ success: true, result: stringMatching(cipherPattern(largeJson)) });
    expect(matchEncryptedPattern(encLargeObj.result as string)).toBe(true);

    const decLargeObj = nodeKit.tryDecryptObj(encLargeObj.result as string, key);
    expect(decLargeObj).toStrictEqual({ success: true, result: largeObj });
    expect(decLargeObj.result).toStrictEqual(largeObj);
  });

  test("Web: Encrypt Object", async () => {
    const key = await webKit.createSecretKey(secret);
    const encObj = await webKit.tryEncryptObj(smallObj, key);
    expect(encObj).toStrictEqual({ success: true, result: stringMatching(cipherPattern(smallJson)) });
    expect(matchEncryptedPattern(encObj.result as string)).toBe(true);

    const decObj = await webKit.tryDecryptObj(encObj.result as string, key);
    expect(decObj).toStrictEqual({ success: true, result: smallObj });
    expect(decObj.result).toStrictEqual(smallObj);

    const encLargeObj = await webKit.tryEncryptObj(largeObj, key);
    expect(encLargeObj).toStrictEqual({ success: true, result: stringMatching(cipherPattern(largeJson)) });
    expect(matchEncryptedPattern(encLargeObj.result as string)).toBe(true);

    const decLargeObj = await webKit.tryDecryptObj(encLargeObj.result as string, key);
    expect(decLargeObj).toStrictEqual({ success: true, result: largeObj });
    expect(decLargeObj.result).toStrictEqual(largeObj);
  });

  test("Fail: Encrypt with Wrong Options type", async () => {
    const nodeKey = nodeKit.createSecretKey(secret);
    const webKey = await webKit.createSecretKey(secret);

    // @ts-expect-error -- options must be an object; checks runtime validation
    const nodeEnc = nodeKit.tryEncrypt(data, nodeKey, 3.14);
    expect(nodeEnc).toStrictEqual(
      failure("node encrypt: Options must be a plain object", 'Pass an object like { outputEncoding: "base64url" }'),
    );

    // @ts-expect-error -- options must be an object; checks runtime validation
    const webEnc = await webKit.tryEncrypt(data, webKey, 3.14);
    expect(webEnc).toStrictEqual(
      failure("web encrypt: Options must be a plain object", 'Pass an object like { outputEncoding: "base64url" }'),
    );
  });

  test("Fail: Decrypt with Wrong Options type", async () => {
    const nodeKey = nodeKit.createSecretKey(secret);
    const webKey = await webKit.createSecretKey(secret);

    const nodeEnc = nodeKit.encrypt(data, nodeKey);
    const webEnc = await webKit.encrypt(data, webKey);

    // @ts-expect-error -- options must be an object; checks runtime validation
    const nodeDec = nodeKit.tryDecrypt(nodeEnc, nodeKey, 3.14);
    expect(nodeDec).toStrictEqual(
      failure("node decrypt: Options must be a plain object", 'Pass an object like { inputEncoding: "base64url" }'),
    );

    // @ts-expect-error -- options must be an object; checks runtime validation
    const webDec = await webKit.tryDecrypt(webEnc, webKey, 3.14);
    expect(webDec).toStrictEqual(
      failure("web decrypt: Options must be a plain object", 'Pass an object like { inputEncoding: "base64url" }'),
    );
  });

  test("Fail: Encrypt with Invalid Options", async () => {
    const nodeKey = nodeKit.createSecretKey(secret);
    const webKey = await webKit.createSecretKey(secret);

    // @ts-expect-error -- unsupported encoding on purpose; checks runtime validation
    const nodeEnc = nodeKit.tryEncrypt(data, nodeKey, { outputEncoding: "invalid-encoding" });
    expect(nodeEnc).toStrictEqual(
      failure("node encrypt: Unsupported output encoding", "Use base64, base64url, or hex"),
    );

    // @ts-expect-error -- unsupported encoding on purpose; checks runtime validation
    const webEnc = await webKit.tryEncrypt(data, webKey, { outputEncoding: "invalid-encoding" });
    expect(webEnc).toStrictEqual(failure("web encrypt: Unsupported output encoding", "Use base64, base64url, or hex"));
  });

  test("Fail: Decrypt with Invalid Options", async () => {
    const nodeKey = nodeKit.createSecretKey(secret);
    const webKey = await webKit.createSecretKey(secret);

    const nodeEnc = nodeKit.encrypt(data, nodeKey);
    const webEnc = await webKit.encrypt(data, webKey);

    // @ts-expect-error -- unsupported encoding on purpose; checks runtime validation
    const nodeDec = nodeKit.tryDecrypt(nodeEnc, nodeKey, { inputEncoding: "invalid-encoding" });
    expect(nodeDec).toStrictEqual(failure("node decrypt: Unsupported input encoding", "Use base64, base64url, or hex"));

    // @ts-expect-error -- unsupported encoding on purpose; checks runtime validation
    const webDec = await webKit.tryDecrypt(webEnc, webKey, { inputEncoding: "invalid-encoding" });
    expect(webDec).toStrictEqual(failure("web decrypt: Unsupported input encoding", "Use base64, base64url, or hex"));
  });

  test("Fail: Decrypt with Wrong Key", async () => {
    const nodeKey1 = nodeKit.createSecretKey(secret);
    const nodeKey2 = nodeKit.createSecretKey(`${secret}!`);
    const webKey1 = await webKit.createSecretKey(secret);
    const webKey2 = await webKit.createSecretKey(`${secret}!`);

    const nodeEnc = nodeKit.encrypt(data, nodeKey1);
    const webEnc = await webKit.encrypt(data, webKey1);

    const nodeDec = nodeKit.tryDecrypt(nodeEnc, nodeKey2);
    expect(nodeDec).toStrictEqual(
      failure("node decrypt: Failed to decrypt data", "Unsupported state or unable to authenticate data"),
    );

    const webDec = await webKit.tryDecrypt(webEnc, webKey2);
    expect(webDec).toStrictEqual(runtimeFailure("web decrypt: Failed to decrypt data"));
  });

  test("Fail: Decrypt with Wrong Key Algorithm", async () => {
    const nodeKey1 = nodeKit.createSecretKey(secret, { algorithm: "aes256gcm" });
    const nodeKey2 = nodeKit.createSecretKey(secret, { algorithm: "aes128gcm" });
    const webKey1 = await webKit.createSecretKey(secret, { algorithm: "aes256gcm" });
    const webKey2 = await webKit.createSecretKey(secret, { algorithm: "aes128gcm" });

    const nodeEnc = nodeKit.encrypt(data, nodeKey1);
    const webEnc = await webKit.encrypt(data, webKey1);

    const nodeDec = nodeKit.tryDecrypt(nodeEnc, nodeKey2);
    expect(nodeDec).toStrictEqual(
      failure("node decrypt: Failed to decrypt data", "Unsupported state or unable to authenticate data"),
    );

    const webDec = await webKit.tryDecrypt(webEnc, webKey2);
    expect(webDec).toStrictEqual(runtimeFailure("web decrypt: Failed to decrypt data"));
  });

  test("Fail: Decrypt with Wrong Derived Key", async () => {
    const nodeKey1 = nodeKit.createSecretKey(secret, { digest: "sha256" });
    const nodeKey2 = nodeKit.createSecretKey(secret, { digest: "sha512" });
    const webKey1 = await webKit.createSecretKey(secret, { digest: "sha256" });
    const webKey2 = await webKit.createSecretKey(secret, { digest: "sha512" });

    const nodeEnc = nodeKit.encrypt(data, nodeKey1);
    const webEnc = await webKit.encrypt(data, webKey1);

    const nodeDec = nodeKit.tryDecrypt(nodeEnc, nodeKey2);
    expect(nodeDec).toStrictEqual(
      failure("node decrypt: Failed to decrypt data", "Unsupported state or unable to authenticate data"),
    );

    const webDec = await webKit.tryDecrypt(webEnc, webKey2);
    expect(webDec).toStrictEqual(runtimeFailure("web decrypt: Failed to decrypt data"));
  });

  test("Cross-platform: Node encrypt → Web decrypt", async () => {
    const nodeKey = nodeKit.createSecretKey(secret);
    const webKey = await webKit.createSecretKey(secret);

    const encrypted = nodeKit.encrypt(data, nodeKey);
    expect(encrypted).toMatch(cipherPattern(data));
    expect(matchEncryptedPattern(encrypted)).toBe(true);

    const decrypted = await webKit.decrypt(encrypted, webKey);
    expect(decrypted).toBe(data);
  });

  test("Cross-platform: Web encrypt → Node decrypt", async () => {
    const nodeKey = nodeKit.createSecretKey(secret);
    const webKey = await webKit.createSecretKey(secret);

    const encrypted = await webKit.encrypt(data, webKey);
    expect(encrypted).toMatch(cipherPattern(data));
    expect(matchEncryptedPattern(encrypted)).toBe(true);

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
    const algorithms = lacksNodeAes192 ? (["aes128gcm"] as const) : (["aes128gcm", "aes192gcm"] as const);
    for (const algorithm of algorithms) {
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

  test("Node: decrypt() throwing variant with wrong key", () => {
    const key1 = nodeKit.createSecretKey(secret);
    const key2 = nodeKit.createSecretKey(`${secret}!`);
    const enc = nodeKit.encrypt(data, key1);
    expect(() => nodeKit.decrypt(enc, key2)).toThrow("node decrypt: Failed to decrypt data");
  });

  test("Web: decrypt() throwing variant with wrong key", async () => {
    const key1 = await webKit.createSecretKey(secret);
    const key2 = await webKit.createSecretKey(`${secret}!`);
    const enc = await webKit.encrypt(data, key1);
    await expect(webKit.decrypt(enc, key2)).rejects.toThrow("web decrypt: Failed to decrypt data");
  });

  test("Node: encrypt rejects empty string but accepts whitespace", () => {
    const key = nodeKit.createSecretKey(secret);
    const encResult = nodeKit.tryEncrypt("", key);
    expect(encResult.success).toBe(false);

    const encWsResult = nodeKit.tryEncrypt("   ", key);
    expect(encWsResult.success).toBe(true);
  });

  test("Web: encrypt rejects empty string but accepts whitespace", async () => {
    const key = await webKit.createSecretKey(secret);
    const encResult = await webKit.tryEncrypt("", key);
    expect(encResult.success).toBe(false);

    const encWsResult = await webKit.tryEncrypt("   ", key);
    expect(encWsResult.success).toBe(true);
  });
});
