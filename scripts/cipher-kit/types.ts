import type {
  CipherEncoding,
  CreateSecretKeyOptions,
  DecryptOptions,
  DigestAlgorithm,
  Encoding,
  EncryptionAlgorithm,
  EncryptOptions,
  ErrorStruct,
  HashOptions,
  HashPasswordOptions,
  NodeSecretKey,
  Result,
  VerifyPasswordOptions,
  WebSecretKey,
  matchEncryptedPattern,
  nodeKit,
  parseToObj,
  stringifyObj,
  tryParseToObj,
  tryStringifyObj,
  webKit,
} from "cipher-kit";
import type {
  ENCRYPTED_REGEX as NodeEncryptedRegex,
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
  matchEncryptedPattern as nodeMatchEncrypted,
  parseToObj as nodeParseToObj,
  stringifyObj as nodeStringifyObj,
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
  tryParseToObj as nodeTryParseToObj,
  tryStringifyObj as nodeTryStringifyObj,
  tryVerifyPassword,
  verifyPassword,
} from "cipher-kit/node";
import type {
  createSecretKey as webCreateSecretKey,
  isWebSecretKey,
  tryHash as webTryHash,
} from "cipher-kit/web-api";

// Root entry point — types
const _encoding: CipherEncoding = "base64url";
const _fullEncoding: Encoding = "utf8";
const _algorithm: EncryptionAlgorithm = "aes256gcm";
const _digest: DigestAlgorithm = "sha256";
const _encryptOpts: EncryptOptions = { outputEncoding: "base64url" };
const _decryptOpts: DecryptOptions = { inputEncoding: "hex" };
const _hashOpts: HashOptions = { digest: "sha256", outputEncoding: "base64" };
const _createKeyOpts: CreateSecretKeyOptions = { algorithm: "aes256gcm", digest: "sha256" };
const _hashPwOpts: HashPasswordOptions = { digest: "sha512", iterations: 320000 };
const _verifyPwOpts: VerifyPasswordOptions = { digest: "sha512", iterations: 320000 };
const _result: Result<string> = { success: true, result: "" };
const _errStruct: ErrorStruct = { message: "", description: "" };
const _nodeKey: NodeSecretKey = {} as NodeSecretKey;
const _webKey: WebSecretKey = {} as WebSecretKey;

// Root entry point — values
const _matchEncrypted: typeof matchEncryptedPattern = {} as typeof matchEncryptedPattern;
const _parseToObj: typeof parseToObj = {} as typeof parseToObj;
const _stringifyObj: typeof stringifyObj = {} as typeof stringifyObj;
const _tryParseToObj: typeof tryParseToObj = {} as typeof tryParseToObj;
const _tryStringifyObj: typeof tryStringifyObj = {} as typeof tryStringifyObj;
const _nodeKit: typeof nodeKit = {} as typeof nodeKit;
const _webKit: typeof webKit = {} as typeof webKit;

// Node entry point — all functions
const _isNodeSecretKey: typeof isNodeSecretKey = {} as typeof isNodeSecretKey;
const _generateUuid: typeof generateUuid = {} as typeof generateUuid;
const _tryGenerateUuid: typeof tryGenerateUuid = {} as typeof tryGenerateUuid;
const _createKey: typeof createSecretKey = {} as typeof createSecretKey;
const _tryCreateKey: typeof tryCreateSecretKey = {} as typeof tryCreateSecretKey;
const _encrypt: typeof encrypt = {} as typeof encrypt;
const _tryEncrypt: typeof tryEncrypt = {} as typeof tryEncrypt;
const _decrypt: typeof decrypt = {} as typeof decrypt;
const _tryDecrypt: typeof tryDecrypt = {} as typeof tryDecrypt;
const _encryptObj: typeof encryptObj = {} as typeof encryptObj;
const _tryEncryptObj: typeof tryEncryptObj = {} as typeof tryEncryptObj;
const _decryptObj: typeof decryptObj = {} as typeof decryptObj;
const _tryDecryptObj: typeof tryDecryptObj = {} as typeof tryDecryptObj;
const _hash: typeof hash = {} as typeof hash;
const _tryHash: typeof tryHash = {} as typeof tryHash;
const _hashPassword: typeof hashPassword = {} as typeof hashPassword;
const _tryHashPassword: typeof tryHashPassword = {} as typeof tryHashPassword;
const _verifyPassword: typeof verifyPassword = {} as typeof verifyPassword;
const _tryVerifyPassword: typeof tryVerifyPassword = {} as typeof tryVerifyPassword;
const _convertStrToBytes: typeof convertStrToBytes = {} as typeof convertStrToBytes;
const _tryConvertStrToBytes: typeof tryConvertStrToBytes = {} as typeof tryConvertStrToBytes;
const _convertBytesToStr: typeof convertBytesToStr = {} as typeof convertBytesToStr;
const _tryConvertBytesToStr: typeof tryConvertBytesToStr = {} as typeof tryConvertBytesToStr;
const _convertEncoding: typeof convertEncoding = {} as typeof convertEncoding;
const _tryConvertEncoding: typeof tryConvertEncoding = {} as typeof tryConvertEncoding;
const _nodeMatchEncrypted: typeof nodeMatchEncrypted = {} as typeof nodeMatchEncrypted;
const _nodeParseToObj: typeof nodeParseToObj = {} as typeof nodeParseToObj;
const _nodeStringifyObj: typeof nodeStringifyObj = {} as typeof nodeStringifyObj;
const _nodeTryParseToObj: typeof nodeTryParseToObj = {} as typeof nodeTryParseToObj;
const _nodeTryStringifyObj: typeof nodeTryStringifyObj = {} as typeof nodeTryStringifyObj;
const _nodeEncryptedRegex: typeof NodeEncryptedRegex = {} as typeof NodeEncryptedRegex;

// Web entry point — key functions
const _webCreateKey: typeof webCreateSecretKey = {} as typeof webCreateSecretKey;
const _isWebSecretKey: typeof isWebSecretKey = {} as typeof isWebSecretKey;
const _webTryHash: typeof webTryHash = {} as typeof webTryHash;
