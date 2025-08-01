import fs from 'node:fs';
import path from 'node:path';
import forge from 'node-forge';

export function generateCertificates(certificatesPath: string) {
  if (fs.existsSync(certificatesPath)) fs.rmSync(certificatesPath, { recursive: true });

  fs.mkdirSync(certificatesPath, { recursive: true });

  const keys = forge.pki.rsa.generateKeyPair(2048);
  const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
  fs.writeFileSync(path.join(certificatesPath, 'key.pem'), privateKeyPem);

  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  const attrs = [{ name: 'commonName', value: 'localhost' }];

  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  cert.sign(keys.privateKey, forge.md.sha256.create());

  const certPem = forge.pki.certificateToPem(cert);
  fs.writeFileSync(path.join(certificatesPath, 'cert.pem'), certPem);
}
