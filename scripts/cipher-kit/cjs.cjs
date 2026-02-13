const assert = require("node:assert/strict");
const {
  ENCRYPTED_REGEX,
  matchEncryptedPattern,
  nodeKit,
  parseToObj,
  stringifyObj,
  tryParseToObj,
  tryStringifyObj,
  webKit,
} = require("cipher-kit");
const {
  ENCRYPTED_REGEX: NODE_ENCRYPTED_REGEX,
  convertBytesToStr,
  convertEncoding,
  convertStrToBytes,
  createSecretKey,
  decrypt,
  decryptObj,
  encrypt,
  encryptObj,
  generateUuid,
  matchEncryptedPattern: nodeMatchEncryptedPattern,
  parseToObj: nodeParseToObj,
  stringifyObj: nodeStringifyObj,
  tryParseToObj: nodeTryParseToObj,
  tryStringifyObj: nodeTryStringifyObj,
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
} = require("cipher-kit/node");
const webApi = require("cipher-kit/web-api");

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
const plaintext = "Hello from CJS smoke test!";
const encrypted = encrypt(plaintext, key);
assert.equal(decrypt(encrypted, key), plaintext);

const hashResult = tryHash("smoke-test-data");
assert.equal(hashResult.success, true);
assert.ok(typeof hashResult.result === "string" && hashResult.result.length > 0);

// Web API functional: async encrypt/decrypt roundtrip (requires globalThis.crypto, Node 20+)
(async () => {
  if (globalThis.crypto?.subtle) {
    const webKey = await webApi.createSecretKey("smoke-test-secret");
    const webEncrypted = await webApi.encrypt("Hello from Web CJS!", webKey);
    assert.equal(await webApi.decrypt(webEncrypted, webKey), "Hello from Web CJS!");
  }

  console.log("cipher-kit: all CJS tests OK");
})();
