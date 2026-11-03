import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { $certificate, $tbsCertificate } from "./certificate.js";
import { $errorCode } from "./error-code.js";

const MAX_BACKUPS = 100;
const IPV4_LOOPBACK = Uint8Array.of(127, 0, 0, 1);
const IPV6_LOOPBACK = Uint8Array.of(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1);

/** 16 random bytes with the high bit clear, never all zero: a positive serial number (RFC 5280 4.1.2.2). */
function $serialNumber(): Uint8Array {
  const serialBytes = crypto.randomBytes(16);
  serialBytes[0] = (serialBytes[0] ?? 0) & 0x7f;
  if (serialBytes.every((b) => b === 0)) serialBytes[serialBytes.length - 1] = 1;
  return serialBytes;
}

function $toPem(label: string, der: Uint8Array): string {
  const base64 = Buffer.from(der).toString("base64");
  const lines: string[] = [];
  for (let i = 0; i < base64.length; i += 64) lines.push(base64.slice(i, i + 64));
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----\n`;
}

/** Writes a new self-signed `key.pem` and `cert.pem` for localhost into `dir`. */
export function $generateCerts(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });

  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const notBefore = new Date(Date.now() - 5 * 60 * 1000);
  const notAfter = new Date(notBefore);
  notAfter.setUTCFullYear(notAfter.getUTCFullYear() + 1);

  const tbs = $tbsCertificate({
    serial: $serialNumber(),
    notBefore,
    notAfter,
    commonName: "localhost",
    dnsNames: ["localhost"],
    ipAddresses: [IPV4_LOOPBACK, IPV6_LOOPBACK],
    subjectPublicKeyInfo: publicKey.export({ type: "spki", format: "der" }),
  });
  const cert = $certificate(tbs, crypto.sign("sha256", tbs, privateKey));

  $writeAtomic(path.join(dir, "key.pem"), privateKey.export({ type: "pkcs1", format: "pem" }), 0o600);
  $writeAtomic(path.join(dir, "cert.pem"), $toPem("CERTIFICATE", cert), 0o644);
}

function $writeAtomic(filePath: string, content: string, mode: number): void {
  const tmpDir = fs.mkdtempSync(path.join(path.dirname(filePath), ".tmp-cert-"));
  const tmpPath = path.join(tmpDir, path.basename(filePath));
  try {
    fs.chmodSync(tmpDir, 0o700);
    fs.writeFileSync(tmpPath, content, { mode, flag: "wx" });
    fs.renameSync(tmpPath, filePath);
  } catch (error) {
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      // The temporary file may not exist yet. The original error is the one to report.
    }
    throw error;
  } finally {
    try {
      fs.rmdirSync(tmpDir);
    } catch {
      // Best effort: a directory left behind has mode 700, and mkdtemp never reuses its name.
    }
  }
}

/** Copies `filePath` to a new `*.bak` file (mode 600) without overwriting older backups. Returns the backup path, or `undefined` if the file does not exist. */
export function $backupFile(filePath: string): string | undefined {
  let content: Buffer;
  try {
    content = fs.readFileSync(filePath);
  } catch (error) {
    if ($errorCode(error) === "ENOENT") return undefined;
    throw error;
  }

  for (let i = 0; i < MAX_BACKUPS; i++) {
    const target = i === 0 ? `${filePath}.bak` : `${filePath}.${i}.bak`;
    try {
      fs.writeFileSync(target, content, { mode: 0o600, flag: "wx" });
      return target;
    } catch (error) {
      if ($errorCode(error) !== "EEXIST") throw error;
    }
  }
  throw new Error(`Error backing up ${filePath}: too many existing backups`);
}
