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
import { $convertBytesToStr, $convertStrToBytes, textEncoder } from './web-encode';

export function $generateUuid(): Result<string> {
  try {
    return $ok(crypto.randomUUID());
  } catch (error) {
    return $err({ msg: 'Crypto Web API - UUID Generation: Failed to generate UUID', desc: $fmtError(error) });
  }
}

export async function $createSecretKey(
  secret: string,
  options: CreateSecretKeyOptions = {},
): Promise<Result<{ result: SecretKey<'web'> }>> {
  if (!$isStr(secret)) {
    return $err({ msg: 'Crypto Web API - Key Generation: Empty Secret', desc: 'Secret must be a non-empty string' });
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
    const ikm = await crypto.subtle.importKey('raw', textEncoder.encode(secret.normalize('NFKC')), 'HKDF', false, [
      'deriveKey',
    ]);
    const key = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: digestAlgo.web,
        salt: textEncoder.encode(salt.normalize('NFKC')),
        info: textEncoder.encode(info.normalize('NFKC')),
      },
      ikm,
      { name: encryptAlgo.web, length: encryptAlgo.keyBytes * 8 },
      true,
      ['encrypt', 'decrypt'],
    );
    const secretKey = Object.freeze({
      platform: 'web',
      digest: digest,
      algo: encryptAlgo,
      key: key,
    }) as SecretKey<'web'>;

    return $ok({ result: secretKey });
  } catch (error) {
    return $err({
      msg: 'Crypto Web API - Key Generation: Failed to create secret key',
      desc: $fmtError(error),
    });
  }
}

export async function $encrypt(
  data: string,
  secretKey: SecretKey<'web'>,
  options: EncryptOptions = {},
): Promise<Result<string>> {
  if (!$isStr(data)) {
    return $err({
      msg: 'Crypto Web API - Encryption: Empty data for encryption',
      desc: 'Data must be a non-empty string',
    });
  }

  const inputEncoding = options.inputEncoding ?? 'utf8';
  const outputEncoding = options.outputEncoding ?? 'base64url';
  if (!ENCODINGS.includes(inputEncoding) || !ENCODINGS.includes(outputEncoding)) {
    return $err({
      msg: `Crypto Web API - Encryption: Unsupported encoding: input ${inputEncoding} or output ${outputEncoding}`,
      desc: 'Use base64, base64url, hex, utf8, or latin1',
    });
  }

  if (!isSecretKey(secretKey, 'web')) {
    return $err({
      msg: 'Crypto Web API - Encryption: Invalid Secret Key',
      desc: 'Expected a Web SecretKey',
    });
  }

  const { result, error } = $convertStrToBytes(data, inputEncoding);
  if (error) return $err(error);

  try {
    const iv = crypto.getRandomValues(new Uint8Array(secretKey.algo.ivLength));
    const cipherWithTag = await crypto.subtle.encrypt({ name: secretKey.algo.web, iv: iv }, secretKey.key, result);

    const ivStr = $convertBytesToStr(iv, outputEncoding);
    const cipherStr = $convertBytesToStr(cipherWithTag, outputEncoding);

    if (ivStr.error || cipherStr.error) {
      return $err({
        msg: 'Crypto Web API - Encryption: Failed to convert IV or encrypted data',
        desc: `Conversion error: ${ivStr.error || cipherStr.error}`,
      });
    }

    return $ok(`${ivStr.result}.${cipherStr.result}.`);
  } catch (error) {
    return $err({ msg: 'Crypto Web API - Encryption: Failed to encrypt data', desc: $fmtError(error) });
  }
}

export async function $decrypt(
  encrypted: string,
  secretKey: SecretKey<'web'>,
  options: DecryptOptions = {},
): Promise<Result<string>> {
  if (matchPattern(encrypted, 'web') === false) {
    return $err({
      msg: 'Crypto Web API - Decryption: Invalid encrypted data format',
      desc: 'Encrypted data must be in the format "iv.cipherWithTag."',
    });
  }

  const inputEncoding = options.inputEncoding ?? 'base64url';
  const outputEncoding = options.outputEncoding ?? 'utf8';
  if (!ENCODINGS.includes(inputEncoding) || !ENCODINGS.includes(outputEncoding)) {
    return $err({
      msg: `Crypto Web API - Decryption: Unsupported encoding: input ${inputEncoding} or output ${outputEncoding}`,
      desc: 'Use base64, base64url, hex, utf8, or latin1',
    });
  }

  const [iv, encryptedWithTag] = encrypted.split('.', 3);
  if (!$isStr(iv) || !$isStr(encryptedWithTag)) {
    return $err({
      msg: 'Crypto Web API - Decryption: Invalid encrypted data',
      desc: 'Encrypted data must contain valid IV, encrypted and tag components',
    });
  }

  if (!isSecretKey(secretKey, 'web')) {
    return $err({
      msg: 'Crypto Web API - Decryption: Invalid Secret Key',
      desc: 'Expected a Web SecretKey',
    });
  }

  const ivBytes = $convertStrToBytes(iv, inputEncoding);
  const cipherWithTagBytes = $convertStrToBytes(encryptedWithTag, inputEncoding);

  if (ivBytes.error || cipherWithTagBytes.error) {
    return $err({
      msg: 'Crypto Web API - Decryption: Failed to convert IV or encrypted data',
      desc: `Conversion error: ${ivBytes.error || cipherWithTagBytes.error}`,
    });
  }

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: secretKey.algo.web, iv: ivBytes.result },
      secretKey.key,
      cipherWithTagBytes.result,
    );

    return $convertBytesToStr(decrypted, 'utf8');
  } catch (error) {
    return $err({ msg: 'Crypto Web API - Decryption: Failed to decrypt data', desc: $fmtError(error) });
  }
}

export async function $encryptObj<T extends object = Record<string, unknown>>(
  data: T,
  secretKey: SecretKey<'web'>,
  options: EncryptOptions = {},
): Promise<Result<string>> {
  const { result, error } = $stringifyObj(data);
  if (error) return $err(error);
  return await $encrypt(result, secretKey, options);
}

export async function $decryptObj<T extends object = Record<string, unknown>>(
  encrypted: string,
  secretKey: SecretKey<'web'>,
  options: DecryptOptions = {},
): Promise<Result<{ result: T }>> {
  const { result, error } = await $decrypt(encrypted, secretKey, options);
  if (error) return $err(error);
  return $parseToObj<T>(result);
}

export async function $hash(data: string, options: HashOptions = {}): Promise<Result<string>> {
  if (!$isStr(data)) {
    return $err({ msg: 'Crypto Web API - Hashing: Empty data for hashing', desc: 'Data must be a non-empty string' });
  }

  const inputEncoding = options.inputEncoding ?? 'utf8';
  const outputEncoding = options.outputEncoding ?? 'base64url';
  if (!ENCODINGS.includes(inputEncoding) || !ENCODINGS.includes(outputEncoding)) {
    return $err({
      msg: `Crypto Web API - Hashing: Unsupported input encoding: ${inputEncoding} or output encoding: ${outputEncoding}`,
      desc: 'Use base64, base64url, hex, utf8, or latin1',
    });
  }

  const digest = options.digest ?? 'sha256';
  if (!(digest in DIGEST_ALGORITHMS)) {
    return $err({
      msg: `Crypto Web API - Hashing: Unsupported digest: ${digest}`,
      desc: `Supported digests are: ${Object.keys(DIGEST_ALGORITHMS).join(', ')}`,
    });
  }
  const digestAlgo = DIGEST_ALGORITHMS[digest];

  const { result, error } = $convertStrToBytes(data, inputEncoding);
  if (error) return $err(error);

  try {
    const hashed = await crypto.subtle.digest(digestAlgo.web, result);
    return $convertBytesToStr(hashed, outputEncoding);
  } catch (error) {
    return $err({ msg: 'Crypto Web API - Hashing: Failed to hash data', desc: $fmtError(error) });
  }
}

export async function $hashPassword(
  password: string,
  options: HashPasswordOptions = {},
): Promise<Result<{ hash: string; salt: string }>> {
  if (!$isStr(password)) {
    return $err({
      msg: 'Crypto Web API - Password Hashing: Empty password',
      desc: 'Password must be a non-empty string',
    });
  }

  const digest = options.digest ?? 'sha512';
  if (!(digest in DIGEST_ALGORITHMS)) {
    return $err({
      msg: `Crypto Web API - Password Hashing: Unsupported digest: ${digest}`,
      desc: `Supported digests are: ${Object.keys(DIGEST_ALGORITHMS).join(', ')}`,
    });
  }
  const digestAlgo = DIGEST_ALGORITHMS[digest];

  const outputEncoding = options.outputEncoding ?? 'base64url';
  if (!ENCODINGS.includes(outputEncoding)) {
    return $err({
      msg: `Crypto Web API - Password Hashing: Unsupported output encoding: ${outputEncoding}`,
      desc: 'Use base64, base64url, hex, utf8, or latin1',
    });
  }

  const saltLength = options.saltLength ?? 16;
  if (typeof saltLength !== 'number' || saltLength < 8) {
    return $err({
      msg: 'Crypto Web API - Password Hashing: Weak salt length',
      desc: 'Salt length must be a number and at least 8 bytes (recommended 16)',
    });
  }

  const iterations = options.iterations ?? 320_000;
  if (typeof iterations !== 'number' || iterations < 1000) {
    return $err({
      msg: 'Crypto Web API - Password Hashing: Weak iteration count',
      desc: 'Iterations must be a number and at least 1000 (recommended 320,000 or more)',
    });
  }

  const keyLength = options.keyLength ?? 64;
  if (typeof keyLength !== 'number' || keyLength < 16) {
    return $err({
      msg: 'Crypto Web API - Password Hashing: Weak key length',
      desc: 'Key length must be a number and at least 16 bytes (recommended 64)',
    });
  }

  try {
    const salt = crypto.getRandomValues(new Uint8Array(saltLength));
    const baseKey = await crypto.subtle.importKey(
      'raw',
      textEncoder.encode(password.normalize('NFKC')),
      'PBKDF2',
      false,
      ['deriveBits'],
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: iterations, hash: digestAlgo.web },
      baseKey,
      keyLength * 8,
    );

    const saltStr = $convertBytesToStr(salt, outputEncoding);
    if (saltStr.error) return $err(saltStr.error);

    const hashedPasswordStr = $convertBytesToStr(bits, outputEncoding);
    if (hashedPasswordStr.error) return $err(hashedPasswordStr.error);

    return $ok({ hash: hashedPasswordStr.result, salt: saltStr.result });
  } catch (error) {
    return $err({ msg: 'Crypto Web API - Password Hashing: Failed to hash password', desc: $fmtError(error) });
  }
}

export async function $verifyPassword(
  password: string,
  hashedPassword: string,
  salt: string,
  options: VerifyPasswordOptions = {},
): Promise<boolean> {
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

  const saltBytes = $convertStrToBytes(salt, 'base64url');
  if (saltBytes.error) return false;

  const hashedPasswordBytes = $convertStrToBytes(hashedPassword, 'base64url');
  if (hashedPasswordBytes.error) return false;

  try {
    const baseKey = await crypto.subtle.importKey(
      'raw',
      textEncoder.encode(password.normalize('NFKC')),
      'PBKDF2',
      false,
      ['deriveBits'],
    );

    const bits = new Uint8Array(
      await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: saltBytes.result,
          iterations: iterations,
          hash: digestAlgo.web,
        },
        baseKey,
        keyLength * 8,
      ),
    );

    if (bits.length !== hashedPasswordBytes.result.length) return false;

    let isMatch = true;
    for (let i = 0; i < bits.length; i++) {
      if (bits[i] !== hashedPasswordBytes.result[i]) isMatch = false;
    }

    return isMatch;
  } catch {
    return false;
  }
}
