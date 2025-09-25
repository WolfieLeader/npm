import { Buffer } from 'node:buffer';
import nodeCrypto from 'node:crypto';
import { DIGEST_ALGORITHMS, ENCODINGS, ENCRYPTION_ALGORITHMS } from '~/helpers/consts';
import { $err, $fmtError, $ok, type Result } from '~/helpers/error';
import { $parseToObj, $stringifyObj } from '~/helpers/object';
import type {
  CreateSecretKeyOptions,
  DecryptOptions,
  EncryptOptions,
  HashOptions,
  HashPasswordOptions,
  SecretKey,
  VerifyPasswordOptions,
} from '~/helpers/types';
import { $isStr, isSecretKey, matchPattern } from '~/helpers/validate';
import { $convertBytesToStr, $convertStrToBytes } from './node-encode';

export function $generateUuid(): Result<string> {
  try {
    return $ok(nodeCrypto.randomUUID());
  } catch (error) {
    return $err({ msg: 'Crypto NodeJS API - UUID Generation: Failed to generate UUID', desc: $fmtError(error) });
  }
}

export function $createSecretKey(
  secret: string,
  options: CreateSecretKeyOptions = {},
): Result<{ result: SecretKey<'node'> }> {
  if (!$isStr(secret)) {
    return $err({ msg: 'Crypto NodeJS API - Key Generation: Empty Secret', desc: 'Secret must be a non-empty string' });
  }

  const algorithm = options.algorithm ?? 'aes256gcm';
  if (!(algorithm in ENCRYPTION_ALGORITHMS)) {
    return $err({
      msg: `Crypto NodeJS API - Key Generation: Unsupported algorithm: ${algorithm}`,
      desc: `Supported algorithms are: ${Object.keys(ENCRYPTION_ALGORITHMS).join(', ')}`,
    });
  }

  const digest = options.digest ?? 'sha256';
  if (!(digest in DIGEST_ALGORITHMS)) {
    return $err({
      msg: `Crypto NodeJS API - Key Generation: Unsupported digest: ${digest}`,
      desc: `Supported digests are: ${Object.keys(DIGEST_ALGORITHMS).join(', ')}`,
    });
  }

  const salt = options.salt ?? 'cipher-kit-salt';
  if (!$isStr(salt, 8)) {
    return $err({
      msg: 'Crypto NodeJS API - Key Generation: Weak salt',
      desc: 'Salt must be a non-empty string with at least 8 characters',
    });
  }

  const info = options.info ?? 'cipher-kit';
  if (!$isStr(info)) {
    return $err({
      msg: 'Crypto NodeJS API - Key Generation: Invalid info',
      desc: 'Info must be a non-empty string',
    });
  }

  const encryptAlgo = ENCRYPTION_ALGORITHMS[algorithm];
  const digestAlgo = DIGEST_ALGORITHMS[digest];

  try {
    const derivedKey = nodeCrypto.hkdfSync(
      digestAlgo.node,
      secret.normalize('NFKC'),
      salt.normalize('NFKC'),
      info.normalize('NFKC'),
      encryptAlgo.keyBytes,
    );
    const key = nodeCrypto.createSecretKey(Buffer.from(derivedKey));
    const secretKey = Object.freeze({
      platform: 'node',
      digest: digest,
      algo: encryptAlgo,
      key: key,
    }) as SecretKey<'node'>;

    return $ok({ result: secretKey });
  } catch (error) {
    return $err({ msg: 'Crypto NodeJS API - Key Generation: Failed to create secret key', desc: $fmtError(error) });
  }
}

export function $encrypt(data: string, secretKey: SecretKey<'node'>, options: EncryptOptions = {}): Result<string> {
  if (!$isStr(data)) {
    return $err({
      msg: 'Crypto NodeJS API - Encryption: Empty data for encryption',
      desc: 'Data must be a non-empty string',
    });
  }

  const inputEncoding = options.inputEncoding ?? 'utf8';
  const outputEncoding = options.outputEncoding ?? 'base64url';
  if (!ENCODINGS.includes(inputEncoding) || !ENCODINGS.includes(outputEncoding)) {
    return $err({
      msg: `Crypto NodeJS API - Encryption: Unsupported input encoding: ${inputEncoding} or output encoding: ${outputEncoding}`,
      desc: 'Use base64, base64url, hex, utf8, or latin1',
    });
  }

  if (!isSecretKey(secretKey, 'node')) {
    return $err({
      msg: 'Crypto NodeJS API - Encryption: Invalid Secret Key',
      desc: 'Expected a Node SecretKey',
    });
  }

  const { result, error } = $convertStrToBytes(data, inputEncoding);
  if (error) return $err(error);

  try {
    const iv = nodeCrypto.randomBytes(secretKey.algo.ivLength);
    const cipher = nodeCrypto.createCipheriv(secretKey.algo.node, secretKey.key, iv);
    const encrypted = Buffer.concat([cipher.update(result), cipher.final()]);
    const tag = cipher.getAuthTag();

    const ivStr = $convertBytesToStr(iv, outputEncoding);
    const cipherStr = $convertBytesToStr(encrypted, outputEncoding);
    const tagStr = $convertBytesToStr(tag, outputEncoding);

    if (ivStr.error || cipherStr.error || tagStr.error) {
      return $err({
        msg: 'Crypto NodeJS API - Encryption: Failed to convert IV or encrypted data or tag',
        desc: `Conversion error: ${ivStr.error || cipherStr.error || tagStr.error}`,
      });
    }

    return $ok(`${ivStr.result}.${cipherStr.result}.${tagStr.result}.`);
  } catch (error) {
    return $err({ msg: 'Crypto NodeJS API - Encryption: Failed to encrypt data', desc: $fmtError(error) });
  }
}

export function $decrypt(
  encrypted: string,
  secretKey: SecretKey<'node'>,
  options: DecryptOptions = {},
): Result<string> {
  if (matchPattern(encrypted, 'node') === false) {
    return $err({
      msg: 'Crypto NodeJS API - Decryption: Invalid encrypted data format',
      desc: 'Encrypted data must be in the format "iv.cipher.tag."',
    });
  }

  const inputEncoding = options.inputEncoding ?? 'base64url';
  const outputEncoding = options.outputEncoding ?? 'utf8';
  if (!ENCODINGS.includes(inputEncoding) || !ENCODINGS.includes(outputEncoding)) {
    return $err({
      msg: `Crypto NodeJS API - Decryption: Unsupported input encoding: ${inputEncoding} or output encoding: ${outputEncoding}`,
      desc: 'Use base64, base64url, hex, utf8, or latin1',
    });
  }

  const [iv, cipher, tag] = encrypted.split('.', 4);
  if (!$isStr(iv) || !$isStr(cipher) || !$isStr(tag)) {
    return $err({
      msg: 'Crypto NodeJS API - Decryption: Invalid encrypted data',
      desc: 'Encrypted data must contain valid IV, encrypted data, and tag components',
    });
  }

  if (!isSecretKey(secretKey, 'node')) {
    return $err({
      msg: 'Crypto NodeJS API - Decryption: Invalid Secret Key',
      desc: 'Expected a Node SecretKey',
    });
  }

  const ivBytes = $convertStrToBytes(iv, inputEncoding);
  const cipherBytes = $convertStrToBytes(cipher, inputEncoding);
  const tagBytes = $convertStrToBytes(tag, inputEncoding);

  if (ivBytes.error || cipherBytes.error || tagBytes.error) {
    return $err({
      msg: 'Crypto NodeJS API - Decryption: Failed to convert IV or encrypted data or tag',
      desc: `Conversion error: ${ivBytes.error || cipherBytes.error || tagBytes.error}`,
    });
  }

  try {
    const decipher = nodeCrypto.createDecipheriv(secretKey.algo.node, secretKey.key, ivBytes.result);
    decipher.setAuthTag(tagBytes.result);
    const decrypted = Buffer.concat([decipher.update(cipherBytes.result), decipher.final()]);

    return $convertBytesToStr(decrypted, outputEncoding);
  } catch (error) {
    return $err({ msg: 'Crypto NodeJS API - Decryption: Failed to decrypt data', desc: $fmtError(error) });
  }
}
export function $encryptObj<T extends object = Record<string, unknown>>(
  data: T,
  secretKey: SecretKey<'node'>,
  options: EncryptOptions = {},
): Result<string> {
  const { result, error } = $stringifyObj(data);
  if (error) return $err(error);
  return $encrypt(result, secretKey, options);
}

export function $decryptObj<T extends object = Record<string, unknown>>(
  encrypted: string,
  secretKey: SecretKey<'node'>,
  options: DecryptOptions = {},
): Result<{ result: T }> {
  const { result, error } = $decrypt(encrypted, secretKey, options);
  if (error) return $err(error);
  return $parseToObj<T>(result);
}

export function $hash(data: string, options: HashOptions = {}): Result<string> {
  if (!$isStr(data)) {
    return $err({
      msg: 'Crypto NodeJS API - Hashing: Empty data for hashing',
      desc: 'Data must be a non-empty string',
    });
  }

  const inputEncoding = options.inputEncoding ?? 'utf8';
  const outputEncoding = options.outputEncoding ?? 'base64url';
  if (!ENCODINGS.includes(inputEncoding) || !ENCODINGS.includes(outputEncoding)) {
    return $err({
      msg: `Crypto NodeJS API - Hashing: Unsupported encoding: ${inputEncoding} or ${outputEncoding}`,
      desc: 'Use base64, base64url, hex, utf8, or latin1',
    });
  }

  const digest = options.digest ?? 'sha256';
  if (!(digest in DIGEST_ALGORITHMS)) {
    return $err({
      msg: `Crypto NodeJS API - Hashing: Unsupported digest: ${digest}`,
      desc: `Supported digests are: ${Object.keys(DIGEST_ALGORITHMS).join(', ')}`,
    });
  }
  const digestAlgo = DIGEST_ALGORITHMS[digest];

  const { result, error } = $convertStrToBytes(data, inputEncoding);
  if (error) return $err(error);

  try {
    const hashed = nodeCrypto.createHash(digestAlgo.node).update(result).digest();
    return $convertBytesToStr(hashed, outputEncoding);
  } catch (error) {
    return $err({ msg: 'Crypto NodeJS API - Hashing: Failed to hash data with Crypto NodeJS', desc: $fmtError(error) });
  }
}

export function $hashPassword(
  password: string,
  options: HashPasswordOptions = {},
): Result<{ hash: string; salt: string }> {
  if (!$isStr(password)) {
    return $err({
      msg: 'Crypto NodeJS API - Password Hashing: Empty password for hashing',
      desc: 'Password must be a non-empty string',
    });
  }

  const digest = options.digest ?? 'sha512';
  if (!(digest in DIGEST_ALGORITHMS)) {
    return $err({
      msg: `Crypto NodeJS API - Password Hashing: Unsupported digest: ${digest}`,
      desc: `Supported digests are: ${Object.keys(DIGEST_ALGORITHMS).join(', ')}`,
    });
  }
  const digestAlgo = DIGEST_ALGORITHMS[digest];

  const outputEncoding = options.outputEncoding ?? 'base64url';
  if (!ENCODINGS.includes(outputEncoding)) {
    return $err({
      msg: `Crypto NodeJS API - Password Hashing: Unsupported encoding: ${outputEncoding}`,
      desc: 'Use base64, base64url, hex, utf8, or latin1',
    });
  }

  const saltLength = options.saltLength ?? 16;
  if (typeof saltLength !== 'number' || saltLength < 8) {
    return $err({
      msg: 'Crypto NodeJS API - Password Hashing: Weak salt length',
      desc: 'Salt length must be a number and at least 8 bytes (recommended 16 or more)',
    });
  }

  const iterations = options.iterations ?? 320_000;
  if (typeof iterations !== 'number' || iterations < 1000) {
    return $err({
      msg: 'Crypto NodeJS API - Password Hashing: Weak iterations count',
      desc: 'Iterations must be a number and at least 1000 (recommended 320,000 or more)',
    });
  }

  const keyLength = options.keyLength ?? 64;
  if (typeof keyLength !== 'number' || keyLength < 16) {
    return $err({
      msg: 'Crypto NodeJS API - Password Hashing: Invalid key length',
      desc: 'Key length must be a number and at least 16 bytes (recommended 64 or more)',
    });
  }

  try {
    const salt = nodeCrypto.randomBytes(saltLength);
    const hash = nodeCrypto.pbkdf2Sync(password.normalize('NFKC'), salt, iterations, keyLength, digestAlgo.node);

    return $ok({ salt: salt.toString(outputEncoding), hash: hash.toString(outputEncoding) });
  } catch (error) {
    return $err({ msg: 'Crypto NodeJS API - Password Hashing: Failed to hash password', desc: $fmtError(error) });
  }
}

export function $verifyPassword(
  password: string,
  hashedPassword: string,
  salt: string,
  options: VerifyPasswordOptions = {},
): boolean {
  if (!$isStr(password) || !$isStr(hashedPassword) || !$isStr(salt)) return false;

  const digest = options.digest ?? 'sha512';
  if (!(digest in DIGEST_ALGORITHMS)) return false;
  const digestAlgo = DIGEST_ALGORITHMS[digest];

  const inputEncoding = options.inputEncoding ?? 'base64url';
  if (!ENCODINGS.includes(inputEncoding)) return false;

  const iterations = options.iterations ?? 320_000;
  if (typeof iterations !== 'number' || iterations < 1000) return false;

  const keyLength = options.keyLength ?? 64;
  if (typeof keyLength !== 'number' || keyLength < 16) return false;

  const saltBytes = $convertStrToBytes(salt, inputEncoding);
  if (saltBytes.error) return false;

  const hashedPasswordBytes = $convertStrToBytes(hashedPassword, inputEncoding);
  if (hashedPasswordBytes.error) return false;

  try {
    return nodeCrypto.timingSafeEqual(
      nodeCrypto.pbkdf2Sync(password.normalize('NFKC'), saltBytes.result, iterations, keyLength, digestAlgo.node),
      hashedPasswordBytes.result,
    );
  } catch {
    return false;
  }
}
