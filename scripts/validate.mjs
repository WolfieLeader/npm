// ESM import validation — verifies every public export loads without error.
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
  convertBytesToStr,
  convertEncoding,
  convertStrToBytes,
  createSecretKey,
  decrypt,
  decryptObj,
  encrypt,
  encryptObj,
  generateUuid,
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
  verifyPassword,
} from "cipher-kit/node";

import {
  compress,
  compressObj,
  decompress,
  decompressObj,
  tryCompress,
  tryCompressObj,
  tryDecompress,
  tryDecompressObj,
} from "compress-kit";
import { generateCerts } from "generate-certs";
import { getClientIp } from "get-client-ip";
import { deleteCookie, getCookie, setCookie } from "modern-cookies";

function assert(condition, label) {
  if (!condition) {
    console.error(`FAIL: ${label}`);
    process.exit(1);
  }
}

// cipher-kit root
assert(typeof nodeKit === "object", "nodeKit is object");
assert(typeof webKit === "object", "webKit is object");
assert(typeof parseToObj === "function", "parseToObj is function");
assert(typeof stringifyObj === "function", "stringifyObj is function");
assert(typeof tryParseToObj === "function", "tryParseToObj is function");
assert(typeof tryStringifyObj === "function", "tryStringifyObj is function");
assert(
  typeof ENCRYPTED_REGEX === "object" && ENCRYPTED_REGEX.node instanceof RegExp,
  "ENCRYPTED_REGEX is object with RegExp",
);
assert(typeof matchEncryptedPattern === "function", "matchEncryptedPattern is function");

// cipher-kit/node
assert(typeof createSecretKey === "function", "createSecretKey is function");
assert(typeof tryCreateSecretKey === "function", "tryCreateSecretKey is function");
assert(typeof encrypt === "function", "encrypt is function");
assert(typeof tryEncrypt === "function", "tryEncrypt is function");
assert(typeof decrypt === "function", "decrypt is function");
assert(typeof tryDecrypt === "function", "tryDecrypt is function");
assert(typeof encryptObj === "function", "encryptObj is function");
assert(typeof tryEncryptObj === "function", "tryEncryptObj is function");
assert(typeof decryptObj === "function", "decryptObj is function");
assert(typeof tryDecryptObj === "function", "tryDecryptObj is function");
assert(typeof hash === "function", "hash is function");
assert(typeof tryHash === "function", "tryHash is function");
assert(typeof hashPassword === "function", "hashPassword is function");
assert(typeof tryHashPassword === "function", "tryHashPassword is function");
assert(typeof verifyPassword === "function", "verifyPassword is function");
assert(typeof generateUuid === "function", "generateUuid is function");
assert(typeof tryGenerateUuid === "function", "tryGenerateUuid is function");
assert(typeof isNodeSecretKey === "function", "isNodeSecretKey is function");
assert(typeof convertStrToBytes === "function", "convertStrToBytes is function");
assert(typeof tryConvertStrToBytes === "function", "tryConvertStrToBytes is function");
assert(typeof convertBytesToStr === "function", "convertBytesToStr is function");
assert(typeof tryConvertBytesToStr === "function", "tryConvertBytesToStr is function");
assert(typeof convertEncoding === "function", "convertEncoding is function");
assert(typeof tryConvertEncoding === "function", "tryConvertEncoding is function");

// compress-kit
assert(typeof compress === "function", "compress is function");
assert(typeof tryCompress === "function", "tryCompress is function");
assert(typeof decompress === "function", "decompress is function");
assert(typeof tryDecompress === "function", "tryDecompress is function");
assert(typeof compressObj === "function", "compressObj is function");
assert(typeof tryCompressObj === "function", "tryCompressObj is function");
assert(typeof decompressObj === "function", "decompressObj is function");
assert(typeof tryDecompressObj === "function", "tryDecompressObj is function");

// get-client-ip
assert(typeof getClientIp === "function", "getClientIp is function");

// generate-certs
assert(typeof generateCerts === "function", "generateCerts is function");

// modern-cookies
assert(typeof getCookie === "function", "getCookie is function");
assert(typeof setCookie === "function", "setCookie is function");
assert(typeof deleteCookie === "function", "deleteCookie is function");

console.log("validate.mjs: all ESM imports OK");
