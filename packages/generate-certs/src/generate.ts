import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import forge from "node-forge";
import { $errorCode } from "./error-code.js";

const MAX_BACKUPS = 100;

function $serialNumber(): string {
  const serialBytes = crypto.randomBytes(16);
  serialBytes[0] = (serialBytes[0] ?? 0) & 0x7f;
  if (serialBytes.every((b) => b === 0)) serialBytes[serialBytes.length - 1] = 1;
  return serialBytes.toString("hex");
}

/** Writes a new self-signed `key.pem` and `cert.pem` for localhost into `dir`. */
export function $generateCerts(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });

  const keys = forge.pki.rsa.generateKeyPair(2048);
  const privateKey = forge.pki.privateKeyToPem(keys.privateKey);

  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = $serialNumber();
  cert.validity.notBefore = new Date(Date.now() - 5 * 60 * 1000);
  cert.validity.notAfter = new Date(cert.validity.notBefore);
  cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 1);

  const attrs = [{ name: "commonName", value: "localhost" }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([
    { name: "basicConstraints", cA: false, critical: true },
    { name: "keyUsage", digitalSignature: true, keyEncipherment: true, critical: true },
    { name: "extKeyUsage", serverAuth: true },
    {
      name: "subjectAltName",
      altNames: [
        { type: 2, value: "localhost" },
        { type: 7, ip: "127.0.0.1" },
        { type: 7, ip: "::1" },
      ],
    },
  ]);

  cert.sign(keys.privateKey, forge.md.sha256.create());

  $writeAtomic(path.join(dir, "key.pem"), privateKey, 0o600);
  $writeAtomic(path.join(dir, "cert.pem"), forge.pki.certificateToPem(cert), 0o644);
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
