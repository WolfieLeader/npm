import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import forge from "node-forge";

export function $generateCerts(certificatesPath: string) {
  fs.mkdirSync(certificatesPath, { recursive: true });

  const keys = forge.pki.rsa.generateKeyPair(2048);
  const privateKey = forge.pki.privateKeyToPem(keys.privateKey);

  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  const serialBytes = crypto.randomBytes(16);
  serialBytes[0] = (serialBytes[0] ?? 0) & 0x7f;
  if (serialBytes.every((b) => b === 0)) {
    serialBytes[serialBytes.length - 1] = 1;
  }
  cert.serialNumber = serialBytes.toString("hex");
  cert.validity.notBefore = new Date(Date.now() - 5 * 60 * 1000);
  cert.validity.notAfter = new Date(cert.validity.notBefore);
  cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 1);

  const attrs = [{ name: "commonName", value: "localhost" }];

  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([
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

  const certPem = forge.pki.certificateToPem(cert);
  const keyPath = path.join(certificatesPath, "key.pem");
  const certPath = path.join(certificatesPath, "cert.pem");

  try {
    $writeAtomic(keyPath, privateKey, 0o600);
    $writeAtomic(certPath, certPem);
  } catch (err) {
    try {
      fs.unlinkSync(keyPath);
    } catch {}
    try {
      fs.unlinkSync(certPath);
    } catch {}
    throw err;
  }
}

function $writeAtomic(filePath: string, content: string, mode?: number) {
  const tmpDir = fs.mkdtempSync(path.join(path.dirname(filePath), ".tmp-cert-"));
  fs.chmodSync(tmpDir, 0o700);
  const tmpPath = path.join(tmpDir, path.basename(filePath));
  try {
    fs.writeFileSync(tmpPath, content, mode != null ? { mode, flag: "wx" } : { flag: "wx" });
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    try {
      fs.unlinkSync(tmpPath);
    } catch {}
    throw err;
  } finally {
    try {
      fs.rmdirSync(tmpDir);
    } catch {}
  }
}
