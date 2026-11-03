import { X509Certificate } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import forge from "node-forge";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateCerts } from "../index.js";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const LOCAL_SANS = [
  { type: 2, value: "localhost" },
  { type: 7, ip: "127.0.0.1" },
  { type: 7, ip: "::1" },
];

interface CertSpec {
  subject: forge.pki.CertificateField[];
  issuer?: { cert: forge.pki.Certificate; key: forge.pki.rsa.PrivateKey };
  notAfter?: Date;
}

function makeCert({ subject, issuer, notAfter }: CertSpec) {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "0a";
  cert.validity.notBefore = new Date(Date.now() - 60_000);
  cert.validity.notAfter = notAfter ?? new Date(Date.now() + ONE_YEAR_MS);
  cert.setSubject(subject);
  cert.setIssuer(issuer ? issuer.cert.subject.attributes : subject);
  cert.setExtensions([{ name: "subjectAltName", altNames: LOCAL_SANS }]);
  cert.sign(issuer?.key ?? keys.privateKey, forge.md.sha256.create());
  return { cert, keys, certPem: forge.pki.certificateToPem(cert), keyPem: forge.pki.privateKeyToPem(keys.privateKey) };
}

function makeCa() {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date(Date.now() - 60_000);
  cert.validity.notAfter = new Date(Date.now() + ONE_YEAR_MS);
  const subject = [{ name: "organizationName", value: "dev CA" }];
  cert.setSubject(subject);
  cert.setIssuer(subject);
  cert.setExtensions([{ name: "basicConstraints", cA: true }]);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  return { cert, key: keys.privateKey };
}

describe("generateCerts preserves user files", () => {
  let tmpDir: string;

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  function writePair(keyPem: string, certPem: string) {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gen-certs-preserve-"));
    fs.writeFileSync(path.join(tmpDir, "key.pem"), keyPem, { mode: 0o600 });
    fs.writeFileSync(path.join(tmpDir, "cert.pem"), certPem);
    return tmpDir;
  }

  it("keeps a valid cert with SANs and no CN (mkcert style, issuer differs)", () => {
    const { certPem, keyPem } = makeCert({
      subject: [{ name: "organizationName", value: "mkcert development certificate" }],
    });
    const dir = writePair(keyPem, certPem);
    // Same key signs, but the issuer DN names a CA: not self-issued.
    const result = generateCerts({ certsPath: dir });

    expect(result).toStrictEqual({ key: keyPem, cert: certPem });
    expect(fs.readFileSync(path.join(dir, "cert.pem"), "utf8")).toBe(certPem);
  });

  it("writes backups with mode 600", () => {
    if (process.platform === "win32") return;

    const expired = makeCert({
      subject: [{ name: "commonName", value: "localhost" }],
      notAfter: new Date(Date.now() - 60_000),
    });
    const dir = writePair(expired.keyPem, expired.certPem);

    generateCerts({ certsPath: dir });
    expect(fs.statSync(path.join(dir, "key.pem.bak")).mode & 0o777).toBe(0o600);
  });

  it("keeps a CA-issued cert", () => {
    const ca = makeCa();
    const { certPem, keyPem } = makeCert({
      subject: [{ name: "organizationName", value: "leaf" }],
      issuer: ca,
    });
    const dir = writePair(keyPem, certPem);

    expect(generateCerts({ certsPath: dir }).cert).toBe(certPem);
  });

  it("backs up invalid files before regenerating, without overwriting older backups", () => {
    const expired = makeCert({
      subject: [{ name: "commonName", value: "localhost" }],
      notAfter: new Date(Date.now() - 60_000),
    });
    const dir = writePair(expired.keyPem, expired.certPem);

    const first = generateCerts({ certsPath: dir });
    expect(first.cert).not.toBe(expired.certPem);
    expect(fs.readFileSync(path.join(dir, "cert.pem.bak"), "utf8")).toBe(expired.certPem);
    expect(fs.readFileSync(path.join(dir, "key.pem.bak"), "utf8")).toBe(expired.keyPem);

    fs.writeFileSync(path.join(dir, "cert.pem"), "corrupted");
    generateCerts({ certsPath: dir });
    expect(fs.readFileSync(path.join(dir, "cert.pem.bak"), "utf8")).toBe(expired.certPem);
    expect(fs.readFileSync(path.join(dir, "cert.pem.1.bak"), "utf8")).toBe("corrupted");
    expect(fs.readFileSync(path.join(dir, "key.pem.1.bak"), "utf8")).toBe(first.key);
  });

  it("backs up a lone key.pem before generating a pair", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gen-certs-preserve-"));
    fs.writeFileSync(path.join(tmpDir, "key.pem"), "my-key", { mode: 0o600 });

    generateCerts({ certsPath: tmpDir });

    expect(fs.readFileSync(path.join(tmpDir, "key.pem.bak"), "utf8")).toBe("my-key");
    expect(fs.existsSync(path.join(tmpDir, "cert.pem.bak"))).toBe(false);
  });

  it("does not regenerate when the backup fails", () => {
    const expired = makeCert({
      subject: [{ name: "commonName", value: "localhost" }],
      notAfter: new Date(Date.now() - 60_000),
    });
    const dir = writePair(expired.keyPem, expired.certPem);
    vi.spyOn(fs, "writeFileSync").mockImplementationOnce(() => {
      throw Object.assign(new Error("disk full"), { code: "ENOSPC" });
    });

    expect(() => generateCerts({ certsPath: dir })).toThrow("disk full");
    expect(fs.readFileSync(path.join(dir, "cert.pem"), "utf8")).toBe(expired.certPem);
  });
});

describe("generated certificate", () => {
  let tmpDir: string;

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("is a leaf server certificate", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gen-certs-ext-"));
    const { cert } = generateCerts({ certsPath: tmpDir });
    const x509 = new X509Certificate(cert);
    const parsed = forge.pki.certificateFromPem(cert);

    expect(x509.ca).toBe(false);
    expect(x509.keyUsage).toStrictEqual(["1.3.6.1.5.5.7.3.1"]);
    expect(parsed.getExtension("basicConstraints")).toMatchObject({ cA: false, critical: true });
    expect(parsed.getExtension("keyUsage")).toMatchObject({
      digitalSignature: true,
      keyEncipherment: true,
      keyCertSign: false,
      critical: true,
    });
    expect(parsed.getExtension("extKeyUsage")).toMatchObject({ serverAuth: true });
  });

  it("logs through the logger option only", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gen-certs-log-"));
    const consoleLog = vi.spyOn(console, "log");
    const logger = vi.fn<(message: string) => void>();

    generateCerts({ certsPath: tmpDir });
    expect(consoleLog).not.toHaveBeenCalled();

    generateCerts({ certsPath: tmpDir, logger });
    expect(logger).toHaveBeenCalledWith("Found existing certificates for HTTPS.");
  });
});
