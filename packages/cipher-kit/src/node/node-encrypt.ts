import { Buffer } from "node:buffer";
import nodeCrypto from "node:crypto";
import { CIPHER_ENCODING, DIGEST_ALGORITHMS, ENCRYPTION_ALGORITHMS } from "~/helpers/consts";
import { $err, $fmtError, $fmtResultErr, $ok, type Result, title } from "~/helpers/error";
import { $parseToObj, $stringifyObj } from "~/helpers/object";
import type {
  CreateSecretKeyOptions,
  DecryptOptions,
  EncryptOptions,
  HashOptions,
  HashPasswordOptions,
  SecretKey,
  VerifyPasswordOptions,
} from "~/helpers/types";
import { $isPlainObj, $isSecretKey, $isStr, matchEncryptedPattern } from "~/helpers/validate";
import { $convertBytesToStr, $convertStrToBytes } from "./node-encode";

export function $generateUuid(): Result<string> {
  try {
    return $ok(nodeCrypto.randomUUID());
  } catch (error) {
    return $err({ msg: `${title("node", "UUID Generation")}: Failed to generate UUID`, desc: $fmtError(error) });
  }
}

export function $createSecretKey(
  secret: string,
  options?: CreateSecretKeyOptions,
): Result<{ result: SecretKey<"node"> }> {
  if (!$isStr(secret, 8)) {
    return $err({
      msg: `${title("node", "Key Generation")}: Empty Secret`,
      desc: "Secret must be a non-empty string with at least 8 characters",
    });
  }

  if (!$isPlainObj<CreateSecretKeyOptions>(options)) {
    return $err({
      msg: `${title("node", "Key Generation")}: Invalid options`,
      desc: "Options must be an object",
    });
  }

  const algorithm = options.algorithm ?? "aes256gcm";
  if (!(algorithm in ENCRYPTION_ALGORITHMS)) {
    return $err({
      msg: `${title("node", "Key Generation")}: Unsupported algorithm: ${algorithm}`,
      desc: `Supported algorithms are: ${Object.keys(ENCRYPTION_ALGORITHMS).join(", ")}`,
    });
  }

  const digest = options.digest ?? "sha256";
  if (!(digest in DIGEST_ALGORITHMS)) {
    return $err({
      msg: `${title("node", "Key Generation")}: Unsupported digest: ${digest}`,
      desc: `Supported digests are: ${Object.keys(DIGEST_ALGORITHMS).join(", ")}`,
    });
  }

  const salt = options.salt ?? "cipher-kit-salt";
  if (!$isStr(salt, 8)) {
    return $err({
      msg: `${title("node", "Key Generation")}: Weak salt`,
      desc: "Salt must be a non-empty string with at least 8 characters",
    });
  }

  const info = options.info ?? "cipher-kit";
  if (!$isStr(info)) {
    return $err({
      msg: `${title("node", "Key Generation")}: Invalid info`,
      desc: "Info must be a non-empty string",
    });
  }

  const encryptAlgo = ENCRYPTION_ALGORITHMS[algorithm];
  const digestAlgo = DIGEST_ALGORITHMS[digest];

  try {
    const derivedKey = nodeCrypto.hkdfSync(
      digestAlgo.node,
      secret.normalize("NFKC"),
      salt.normalize("NFKC"),
      info.normalize("NFKC"),
      encryptAlgo.keyBytes,
    );
    const key = nodeCrypto.createSecretKey(Buffer.from(derivedKey));
    const secretKey = Object.freeze({
      platform: "node",
      digest: digest,
      algorithm: algorithm,
      key: key,
    }) as SecretKey<"node">;

    return $ok({ result: secretKey });
  } catch (error) {
    return $err({ msg: `${title("node", "Key Generation")}: Failed to create secret key`, desc: $fmtError(error) });
  }
}

export function $encrypt(data: string, secretKey: SecretKey<"node">, options?: EncryptOptions): Result<string> {
  if (!$isStr(data)) {
    return $err({
      msg: `${title("node", "Encryption")}: Empty data for encryption`,
      desc: "Data must be a non-empty string",
    });
  }

  if (!$isPlainObj<EncryptOptions>(options)) {
    return $err({
      msg: `${title("node", "Encryption")}: Invalid options`,
      desc: "Options must be an object",
    });
  }

  const outputEncoding = options.outputEncoding ?? "base64url";
  if (!CIPHER_ENCODING.includes(outputEncoding)) {
    return $err({
      msg: `${title("node", "Encryption")}: Unsupported output encoding: ${outputEncoding}`,
      desc: "Use base64, base64url, or hex",
    });
  }

  const injectedKey = $isSecretKey(secretKey, "node");
  if (!injectedKey) {
    return $err({
      msg: `${title("node", "Encryption")}: Invalid Secret Key`,
      desc: "Expected a Node SecretKey",
    });
  }

  const { result, error } = $convertStrToBytes(data, "utf8");
  if (error) return $err(error);

  try {
    const iv = nodeCrypto.randomBytes(injectedKey.injected.ivLength);
    const cipher = nodeCrypto.createCipheriv(injectedKey.injected.node, injectedKey.key, iv);
    const encrypted = Buffer.concat([cipher.update(result), cipher.final()]);
    const tag = cipher.getAuthTag();

    const ivStr = $convertBytesToStr(iv, outputEncoding);
    const cipherStr = $convertBytesToStr(encrypted, outputEncoding);
    const tagStr = $convertBytesToStr(tag, outputEncoding);

    if (ivStr.error || cipherStr.error || tagStr.error) {
      return $err({
        msg: "Crypto NodeJS API - Encryption: Failed to convert IV or encrypted data or tag",
        desc: `Conversion error: ${$fmtResultErr(ivStr.error || cipherStr.error || tagStr.error)}`,
      });
    }

    return $ok(`${ivStr.result}.${cipherStr.result}.${tagStr.result}.`);
  } catch (error) {
    return $err({ msg: `${title("node", "Encryption")}: Failed to encrypt data`, desc: $fmtError(error) });
  }
}

export function $decrypt(encrypted: string, secretKey: SecretKey<"node">, options?: DecryptOptions): Result<string> {
  if (!matchEncryptedPattern(encrypted, "node")) {
    return $err({
      msg: `${title("node", "Decryption")}: Invalid encrypted data format`,
      desc: 'Encrypted data must be in the format "iv.cipher.tag."',
    });
  }

  if (!$isPlainObj<DecryptOptions>(options)) {
    return $err({
      msg: `${title("node", "Decryption")}: Invalid options`,
      desc: "Options must be an object",
    });
  }

  const inputEncoding = options.inputEncoding ?? "base64url";
  if (!CIPHER_ENCODING.includes(inputEncoding)) {
    return $err({
      msg: `${title("node", "Decryption")}: Unsupported input encoding: ${inputEncoding}`,
      desc: "Use base64, base64url, or hex",
    });
  }

  const [iv, cipher, tag] = encrypted.split(".", 4);
  if (!$isStr(iv) || !$isStr(cipher) || !$isStr(tag)) {
    return $err({
      msg: `${title("node", "Decryption")}: Invalid encrypted data`,
      desc: "Encrypted data must contain valid IV, encrypted data, and tag components",
    });
  }

  const injectedKey = $isSecretKey(secretKey, "node");
  if (!injectedKey) {
    return $err({
      msg: "Crypto NodeJS API - Decryption: Invalid Secret Key",
      desc: "Expected a Node SecretKey",
    });
  }

  const ivBytes = $convertStrToBytes(iv, inputEncoding);
  const cipherBytes = $convertStrToBytes(cipher, inputEncoding);
  const tagBytes = $convertStrToBytes(tag, inputEncoding);

  if (ivBytes.error || cipherBytes.error || tagBytes.error) {
    return $err({
      msg: `${title("node", "Decryption")}: Failed to convert IV or encrypted data or tag`,
      desc: `Conversion error: ${$fmtResultErr(ivBytes.error || cipherBytes.error || tagBytes.error)}`,
    });
  }

  try {
    const decipher = nodeCrypto.createDecipheriv(injectedKey.injected.node, injectedKey.key, ivBytes.result);
    decipher.setAuthTag(tagBytes.result);
    const decrypted = Buffer.concat([decipher.update(cipherBytes.result), decipher.final()]);

    return $convertBytesToStr(decrypted, "utf8");
  } catch (error) {
    return $err({ msg: `${title("node", "Decryption")}: Failed to decrypt data`, desc: $fmtError(error) });
  }
}
export function $encryptObj<T extends object = Record<string, unknown>>(
  data: T,
  secretKey: SecretKey<"node">,
  options?: EncryptOptions,
): Result<string> {
  const { result, error } = $stringifyObj(data);
  if (error) return $err(error);
  return $encrypt(result, secretKey, options);
}

export function $decryptObj<T extends object = Record<string, unknown>>(
  encrypted: string,
  secretKey: SecretKey<"node">,
  options?: DecryptOptions,
): Result<{ result: T }> {
  const { result, error } = $decrypt(encrypted, secretKey, options);
  if (error) return $err(error);
  return $parseToObj<T>(result);
}

export function $hash(data: string, options: HashOptions = {}): Result<string> {
  if (!$isStr(data)) {
    return $err({
      msg: `${title("node", "Hashing")}: Empty data for hashing`,
      desc: "Data must be a non-empty string",
    });
  }

  if (!$isPlainObj<HashOptions>(options)) {
    return $err({
      msg: `${title("node", "Hashing")}: Invalid options`,
      desc: "Options must be an object",
    });
  }

  const outputEncoding = options.outputEncoding ?? "base64url";
  if (!CIPHER_ENCODING.includes(outputEncoding)) {
    return $err({
      msg: `${title("node", "Hashing")}: Unsupported output encoding: ${outputEncoding}`,
      desc: "Use base64, base64url, or hex",
    });
  }

  const digest = options.digest ?? "sha256";
  if (!(digest in DIGEST_ALGORITHMS)) {
    return $err({
      msg: `${title("node", "Hashing")}: Unsupported digest: ${digest}`,
      desc: `Supported digests are: ${Object.keys(DIGEST_ALGORITHMS).join(", ")}`,
    });
  }
  const digestAlgo = DIGEST_ALGORITHMS[digest];

  const { result, error } = $convertStrToBytes(data, "utf8");
  if (error) return $err(error);

  try {
    const hashed = nodeCrypto.createHash(digestAlgo.node).update(result).digest();
    return $convertBytesToStr(hashed, outputEncoding);
  } catch (error) {
    return $err({ msg: `${title("node", "Hashing")}: Failed to hash data with Crypto NodeJS`, desc: $fmtError(error) });
  }
}

export function $hashPassword(password: string, options?: HashPasswordOptions): Result<{ hash: string; salt: string }> {
  if (!$isStr(password)) {
    return $err({
      msg: `${title("node", "Password Hashing")}: Empty password for hashing`,
      desc: "Password must be a non-empty string",
    });
  }

  if (!$isPlainObj<HashPasswordOptions>(options)) {
    return $err({
      msg: `${title("node", "Password Hashing")}: Invalid options`,
      desc: "Options must be an object",
    });
  }

  const digest = options.digest ?? "sha512";
  if (!(digest in DIGEST_ALGORITHMS)) {
    return $err({
      msg: `${title("node", "Password Hashing")}: Unsupported digest: ${digest}`,
      desc: `Supported digests are: ${Object.keys(DIGEST_ALGORITHMS).join(", ")}`,
    });
  }
  const digestAlgo = DIGEST_ALGORITHMS[digest];

  const outputEncoding = options.outputEncoding ?? "base64url";
  if (!CIPHER_ENCODING.includes(outputEncoding)) {
    return $err({
      msg: `${title("node", "Password Hashing")}: Unsupported encoding: ${outputEncoding}`,
      desc: "Use base64, base64url, or hex",
    });
  }

  const saltLength = options.saltLength ?? 16;
  if (typeof saltLength !== "number" || saltLength < 8) {
    return $err({
      msg: `${title("node", "Password Hashing")}: Weak salt length`,
      desc: "Salt length must be a number and at least 8 bytes (recommended 16 or more)",
    });
  }

  const iterations = options.iterations ?? 320_000;
  if (typeof iterations !== "number" || iterations < 1000) {
    return $err({
      msg: `${title("node", "Password Hashing")}: Weak iterations count`,
      desc: "Iterations must be a number and at least 1000 (recommended 320,000 or more)",
    });
  }

  const keyLength = options.keyLength ?? 64;
  if (typeof keyLength !== "number" || keyLength < 16) {
    return $err({
      msg: `${title("node", "Password Hashing")}: Invalid key length`,
      desc: "Key length must be a number and at least 16 bytes (recommended 64 or more)",
    });
  }

  try {
    const salt = nodeCrypto.randomBytes(saltLength);
    const hash = nodeCrypto.pbkdf2Sync(password.normalize("NFKC"), salt, iterations, keyLength, digestAlgo.node);

    return $ok({ salt: salt.toString(outputEncoding), hash: hash.toString(outputEncoding) });
  } catch (error) {
    return $err({ msg: `${title("node", "Password Hashing")}: Failed to hash password`, desc: $fmtError(error) });
  }
}

export function $verifyPassword(
  password: string,
  hashedPassword: string,
  salt: string,
  options?: VerifyPasswordOptions,
): boolean {
  if (!$isStr(password) || !$isStr(hashedPassword) || !$isStr(salt) || !$isPlainObj<VerifyPasswordOptions>(options)) {
    return false;
  }

  const digest = options.digest ?? "sha512";
  if (!(digest in DIGEST_ALGORITHMS)) return false;
  const digestAlgo = DIGEST_ALGORITHMS[digest];

  const inputEncoding = options.inputEncoding ?? "base64url";
  if (!CIPHER_ENCODING.includes(inputEncoding)) return false;

  const iterations = options.iterations ?? 320_000;
  if (typeof iterations !== "number" || iterations < 1000) return false;

  const keyLength = options.keyLength ?? 64;
  if (typeof keyLength !== "number" || keyLength < 16) return false;

  const saltBytes = $convertStrToBytes(salt, inputEncoding);
  if (saltBytes.error) return false;

  const hashedPasswordBytes = $convertStrToBytes(hashedPassword, inputEncoding);
  if (hashedPasswordBytes.error) return false;

  try {
    return nodeCrypto.timingSafeEqual(
      nodeCrypto.pbkdf2Sync(password.normalize("NFKC"), saltBytes.result, iterations, keyLength, digestAlgo.node),
      hashedPasswordBytes.result,
    );
  } catch {
    return false;
  }
}
