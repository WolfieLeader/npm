import assert from "node:assert/strict";
import {
  ENCRYPTED_REGEX,
  matchEncryptedPattern,
  nodeKit,
  parseToObj,
  stringifyObj,
  tryParseToObj,
  tryStringifyObj,
  webKit,
} from "cipher-kit";
import {
  ENCRYPTED_REGEX as NODE_ENCRYPTED_REGEX,
  convertBytesToStr,
  convertEncoding,
  convertStrToBytes,
  createSecretKey,
  decrypt,
  decryptObj,
  encrypt,
  encryptObj,
  generateUuid,
  matchEncryptedPattern as nodeMatchEncryptedPattern,
  parseToObj as nodeParseToObj,
  stringifyObj as nodeStringifyObj,
  tryParseToObj as nodeTryParseToObj,
  tryStringifyObj as nodeTryStringifyObj,
  hash,
  hashPassword,
  isNodeSecretKey,
  tryConvertBytesToStr,
  tryConvertEncoding,
  tryConvertStrToBytes,
  tryCreateSecretKey,
  tryDecrypt,
  tryDecryptObj,
  tryEncrypt,
  tryEncryptObj,
  tryGenerateUuid,
  tryHash,
  tryHashPassword,
  tryVerifyPassword,
  verifyPassword,
  hmac,
  tryHmac,
  verifyHmac,
  tryVerifyHmac,
  randomToken,
  tryRandomToken,
  randomCode,
  tryRandomCode,
} from "cipher-kit/node";
import * as webApi from "cipher-kit/web-api";

// Root exports
assert.equal(typeof nodeKit, "object");
assert.equal(typeof webKit, "object");
assert.equal(typeof parseToObj, "function");
assert.equal(typeof stringifyObj, "function");
assert.equal(typeof tryParseToObj, "function");
assert.equal(typeof tryStringifyObj, "function");
assert.ok(ENCRYPTED_REGEX instanceof RegExp);
assert.equal(typeof matchEncryptedPattern, "function");

// Node exports
assert.equal(typeof createSecretKey, "function");
assert.equal(typeof tryCreateSecretKey, "function");
assert.equal(typeof encrypt, "function");
assert.equal(typeof tryEncrypt, "function");
assert.equal(typeof decrypt, "function");
assert.equal(typeof tryDecrypt, "function");
assert.equal(typeof encryptObj, "function");
assert.equal(typeof tryEncryptObj, "function");
assert.equal(typeof decryptObj, "function");
assert.equal(typeof tryDecryptObj, "function");
assert.equal(typeof hash, "function");
assert.equal(typeof tryHash, "function");
assert.equal(typeof hashPassword, "function");
assert.equal(typeof tryHashPassword, "function");
assert.equal(typeof verifyPassword, "function");
assert.equal(typeof tryVerifyPassword, "function");
assert.equal(typeof generateUuid, "function");
assert.equal(typeof tryGenerateUuid, "function");
assert.equal(typeof hmac, "function");
assert.equal(typeof tryHmac, "function");
assert.equal(typeof verifyHmac, "function");
assert.equal(typeof tryVerifyHmac, "function");
assert.equal(typeof randomToken, "function");
assert.equal(typeof tryRandomToken, "function");
assert.equal(typeof randomCode, "function");
assert.equal(typeof tryRandomCode, "function");
assert.equal(typeof isNodeSecretKey, "function");
assert.equal(typeof convertStrToBytes, "function");
assert.equal(typeof tryConvertStrToBytes, "function");
assert.equal(typeof convertBytesToStr, "function");
assert.equal(typeof tryConvertBytesToStr, "function");
assert.equal(typeof convertEncoding, "function");
assert.equal(typeof tryConvertEncoding, "function");
assert.equal(typeof nodeParseToObj, "function");
assert.equal(typeof nodeStringifyObj, "function");
assert.equal(typeof nodeTryParseToObj, "function");
assert.equal(typeof nodeTryStringifyObj, "function");
assert.equal(typeof nodeMatchEncryptedPattern, "function");
assert.ok(NODE_ENCRYPTED_REGEX instanceof RegExp);

// Web API exports
assert.equal(typeof webApi.isWebSecretKey, "function");
assert.equal(typeof webApi.createSecretKey, "function");
assert.equal(typeof webApi.tryCreateSecretKey, "function");
assert.equal(typeof webApi.encrypt, "function");
assert.equal(typeof webApi.tryEncrypt, "function");
assert.equal(typeof webApi.decrypt, "function");
assert.equal(typeof webApi.tryDecrypt, "function");
assert.equal(typeof webApi.encryptObj, "function");
assert.equal(typeof webApi.tryEncryptObj, "function");
assert.equal(typeof webApi.decryptObj, "function");
assert.equal(typeof webApi.tryDecryptObj, "function");
assert.equal(typeof webApi.hash, "function");
assert.equal(typeof webApi.tryHash, "function");
assert.equal(typeof webApi.hashPassword, "function");
assert.equal(typeof webApi.tryHashPassword, "function");
assert.equal(typeof webApi.verifyPassword, "function");
assert.equal(typeof webApi.tryVerifyPassword, "function");
assert.equal(typeof webApi.generateUuid, "function");
assert.equal(typeof webApi.tryGenerateUuid, "function");
assert.equal(typeof webApi.hmac, "function");
assert.equal(typeof webApi.tryHmac, "function");
assert.equal(typeof webApi.verifyHmac, "function");
assert.equal(typeof webApi.tryVerifyHmac, "function");
assert.equal(typeof webApi.randomToken, "function");
assert.equal(typeof webApi.tryRandomToken, "function");
assert.equal(typeof webApi.randomCode, "function");
assert.equal(typeof webApi.tryRandomCode, "function");
assert.equal(typeof webApi.convertStrToBytes, "function");
assert.equal(typeof webApi.tryConvertStrToBytes, "function");
assert.equal(typeof webApi.convertBytesToStr, "function");
assert.equal(typeof webApi.tryConvertBytesToStr, "function");
assert.equal(typeof webApi.convertEncoding, "function");
assert.equal(typeof webApi.tryConvertEncoding, "function");
assert.equal(typeof webApi.parseToObj, "function");
assert.equal(typeof webApi.stringifyObj, "function");
assert.equal(typeof webApi.tryParseToObj, "function");
assert.equal(typeof webApi.tryStringifyObj, "function");
assert.equal(typeof webApi.matchEncryptedPattern, "function");
assert.ok(webApi.ENCRYPTED_REGEX instanceof RegExp);

// Node functional: sync encrypt/decrypt roundtrip
const key = createSecretKey("smoke-test-secret");
const plaintext = "Hello from ESM smoke test!";
const encrypted = encrypt(plaintext, key);
assert.equal(decrypt(encrypted, key), plaintext);

// RFC 4231 test case 2
const mac = hmac("what do ya want for nothing?", "Jefe", { outputEncoding: "hex" });
assert.equal(mac, "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843");
assert.equal(verifyHmac("what do ya want for nothing?", mac, "Jefe", { inputEncoding: "hex" }), true);
assert.match(randomToken(), /^[\w-]{43}$/);
assert.match(randomCode(), /^\d{6}$/);
assert.match(generateUuid({ version: 7 }), /^[\da-f]{8}-[\da-f]{4}-7[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);

const hashResult = tryHash("smoke-test-data");
assert.equal(hashResult.success, true);
assert.ok(typeof hashResult.result === "string" && hashResult.result.length > 0);

// Web API functional: async encrypt/decrypt roundtrip (requires globalThis.crypto, Node 20+)
if (globalThis.crypto?.subtle) {
  const webKey = await webApi.createSecretKey("smoke-test-secret");
  const webEncrypted = await webApi.encrypt("Hello from Web ESM!", webKey);
  assert.equal(await webApi.decrypt(webEncrypted, webKey), "Hello from Web ESM!");
}

console.log("cipher-kit: all ESM tests OK");
