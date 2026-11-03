import { describe, expect, test } from "vitest";
import { nodeKit, webKit } from "~/export.js";
import { v3 } from "./__v3-fixtures__.js";

// Stored ciphertexts and password hashes outlive releases. A failure here means data users already hold stops working.
describe("Reads what cipher-kit 3.0.0 wrote", () => {
  for (const { key, encoding, ciphertext } of v3.ciphertexts) {
    test(`decrypts a 3.0.0 ciphertext (key: ${key}, ${encoding}) on Node and Web`, async () => {
      const options = { inputEncoding: encoding };
      expect(nodeKit.decrypt(ciphertext, nodeKit.createSecretKey(v3.secret, v3.keys[key]), options)).toBe(v3.text);
      const webKey = await webKit.createSecretKey(v3.secret, v3.keys[key]);
      expect(await webKit.decrypt(ciphertext, webKey, options)).toBe(v3.text);
    });
  }

  for (const { key, ciphertext } of v3.objects) {
    test(`decrypts a 3.0.0 object (key: ${key}) on Node and Web`, async () => {
      expect(nodeKit.decryptObj(ciphertext, nodeKit.createSecretKey(v3.secret, v3.keys[key]))).toStrictEqual(v3.object);
      const webKey = await webKit.createSecretKey(v3.secret, v3.keys[key]);
      expect(await webKit.decryptObj(ciphertext, webKey)).toStrictEqual(v3.object);
    });
  }

  for (const { digest, encoding, hash } of v3.hashes) {
    test(`hashes exactly as 3.0.0 did (${digest}, ${encoding}) on Node and Web`, async () => {
      const options = { digest, outputEncoding: encoding };
      expect(nodeKit.hash(v3.text, options)).toBe(hash);
      expect(await webKit.hash(v3.text, options)).toBe(hash);
    });
  }

  for (const [i, { verifyOptions, hash, salt }] of v3.passwords.entries()) {
    test(`verifies a 3.0.0 password hash (#${i}) on Node and Web, and rejects a wrong password`, async () => {
      expect(nodeKit.verifyPassword(v3.password, hash, salt, verifyOptions)).toBe(true);
      expect(await webKit.verifyPassword(v3.password, hash, salt, verifyOptions)).toBe(true);
      expect(nodeKit.verifyPassword(`${v3.password}!`, hash, salt, verifyOptions)).toBe(false);
      expect(await webKit.verifyPassword(`${v3.password}!`, hash, salt, verifyOptions)).toBe(false);
    });
  }
});
