import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import forge from "node-forge";
import { afterEach, describe, expect, it } from "vitest";
import { generateCerts } from "../index.js";

const OPTS = { activateLogs: false } as const;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

describe("generateCerts", () => {
  let tmpDir: string;

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function makeTmpDir() {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gen-certs-"));
    return tmpDir;
  }

  it("generates valid PEM key and cert files", () => {
    const certsPath = makeTmpDir();
    const result = generateCerts({ certsPath, ...OPTS });

    expect(result.key).toContain("-----BEGIN RSA PRIVATE KEY-----");
    expect(result.cert).toContain("-----BEGIN CERTIFICATE-----");
    expect(fs.existsSync(path.join(certsPath, "key.pem"))).toBe(true);
    expect(fs.existsSync(path.join(certsPath, "cert.pem"))).toBe(true);
  });

  it("generated cert has correct subject and SANs", () => {
    const certsPath = makeTmpDir();
    const { cert: certPem } = generateCerts({ certsPath, ...OPTS });

    const cert = forge.pki.certificateFromPem(certPem);
    const cn = cert.subject.getField("CN");
    expect(cn.value).toBe("localhost");

    const sanExt = cert.getExtension("subjectAltName") as { altNames: { type: number; value?: string; ip?: string }[] };
    expect(sanExt).toBeDefined();

    const dnsNames = sanExt.altNames.filter((a) => a.type === 2).map((a) => a.value);
    const ips = sanExt.altNames.filter((a) => a.type === 7).map((a) => a.ip);

    expect(dnsNames).toContain("localhost");
    expect(ips).toContain("127.0.0.1");
    expect(ips).toContain("::1");
  });

  it("generated cert has 1-year validity", () => {
    const certsPath = makeTmpDir();
    const { cert: certPem } = generateCerts({ certsPath, ...OPTS });

    const cert = forge.pki.certificateFromPem(certPem);
    const diff = cert.validity.notAfter.getTime() - cert.validity.notBefore.getTime();

    expect(diff).toBeGreaterThanOrEqual(ONE_YEAR_MS - 5000);
    expect(diff).toBeLessThanOrEqual(ONE_YEAR_MS + 5000);
  });

  it("generated key has restricted file permissions", () => {
    if (process.platform === "win32") return;
    const certsPath = makeTmpDir();
    generateCerts({ certsPath, ...OPTS });

    const stat = fs.statSync(path.join(certsPath, "key.pem"));
    const mode = stat.mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it("reuses existing valid certs without regeneration", () => {
    const certsPath = makeTmpDir();
    const first = generateCerts({ certsPath, ...OPTS });

    const keyMtime = fs.statSync(path.join(certsPath, "key.pem")).mtimeMs;
    const certMtime = fs.statSync(path.join(certsPath, "cert.pem")).mtimeMs;

    const second = generateCerts({ certsPath, ...OPTS });

    expect(second.key).toBe(first.key);
    expect(second.cert).toBe(first.cert);
    expect(fs.statSync(path.join(certsPath, "key.pem")).mtimeMs).toBe(keyMtime);
    expect(fs.statSync(path.join(certsPath, "cert.pem")).mtimeMs).toBe(certMtime);
  });

  it("regenerates expired certs", () => {
    const certsPath = makeTmpDir();

    const keys = forge.pki.rsa.generateKeyPair(2048);
    const expiredCert = forge.pki.createCertificate();
    expiredCert.publicKey = keys.publicKey;
    expiredCert.serialNumber = "01";
    expiredCert.validity.notBefore = new Date(Date.now() - 2 * ONE_YEAR_MS);
    expiredCert.validity.notAfter = new Date(Date.now() - ONE_YEAR_MS);
    expiredCert.setSubject([{ name: "commonName", value: "localhost" }]);
    expiredCert.setIssuer([{ name: "commonName", value: "localhost" }]);
    expiredCert.sign(keys.privateKey, forge.md.sha256.create());

    fs.writeFileSync(path.join(certsPath, "key.pem"), forge.pki.privateKeyToPem(keys.privateKey), { mode: 0o600 });
    fs.writeFileSync(path.join(certsPath, "cert.pem"), forge.pki.certificateToPem(expiredCert));

    const result = generateCerts({ certsPath, ...OPTS });
    const newCert = forge.pki.certificateFromPem(result.cert);

    expect(newCert.validity.notAfter.getTime()).toBeGreaterThan(Date.now());
  });

  it("creates certsPath directory if it does not exist", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gen-certs-"));
    const nested = path.join(tmpDir, "deep", "nested", "certs");

    const result = generateCerts({ certsPath: nested, ...OPTS });

    expect(result.key).toContain("-----BEGIN RSA PRIVATE KEY-----");
    expect(fs.existsSync(path.join(nested, "cert.pem"))).toBe(true);
  });

  it("throws when certsPath is relative", () => {
    expect(() => generateCerts({ certsPath: "./relative-certs", ...OPTS })).toThrow("must be an absolute path");
  });

  it("throws on corrupt cert file", () => {
    const certsPath = makeTmpDir();

    fs.writeFileSync(path.join(certsPath, "key.pem"), "not-a-pem", { mode: 0o600 });
    fs.writeFileSync(path.join(certsPath, "cert.pem"), "not-a-pem");

    expect(() => generateCerts({ certsPath, ...OPTS })).toThrow("Error checking for existing certificates");
  });

  it("key and cert are cryptographically paired", () => {
    const certsPath = makeTmpDir();
    const { key: keyPem, cert: certPem } = generateCerts({ certsPath, ...OPTS });

    const data = Buffer.from("test-payload");
    const signature = crypto.sign("sha256", data, keyPem);
    const certObj = new crypto.X509Certificate(certPem);
    const valid = crypto.verify("sha256", data, certObj.publicKey, signature);

    expect(valid).toBe(true);
  });

  it("regenerates when key.pem has insecure permissions", () => {
    if (process.platform === "win32") return;

    const certsPath = makeTmpDir();
    const first = generateCerts({ certsPath, ...OPTS });

    fs.chmodSync(path.join(certsPath, "key.pem"), 0o644);

    const second = generateCerts({ certsPath, ...OPTS });

    expect(second.key).not.toBe(first.key);
    expect(second.cert).not.toBe(first.cert);

    const stat = fs.statSync(path.join(certsPath, "key.pem"));
    expect(stat.mode & 0o777).toBe(0o600);
  });

  it("regenerates when key and cert are mismatched", () => {
    const certsPath = makeTmpDir();
    const first = generateCerts({ certsPath, ...OPTS });

    const otherKeys = forge.pki.rsa.generateKeyPair(2048);
    fs.writeFileSync(path.join(certsPath, "key.pem"), forge.pki.privateKeyToPem(otherKeys.privateKey));
    fs.chmodSync(path.join(certsPath, "key.pem"), 0o600);

    const second = generateCerts({ certsPath, ...OPTS });

    expect(second.key).not.toBe(first.key);
    expect(second.cert).not.toBe(first.cert);
  });

  it("regenerates when cert is not yet valid", () => {
    const certsPath = makeTmpDir();

    const keys = forge.pki.rsa.generateKeyPair(2048);
    const futureCert = forge.pki.createCertificate();
    futureCert.publicKey = keys.publicKey;
    futureCert.serialNumber = "02";
    futureCert.validity.notBefore = new Date(Date.now() + 10 * 60 * 1000);
    futureCert.validity.notAfter = new Date(Date.now() + ONE_YEAR_MS);
    futureCert.setSubject([{ name: "commonName", value: "localhost" }]);
    futureCert.setIssuer([{ name: "commonName", value: "localhost" }]);
    futureCert.setExtensions([
      {
        name: "subjectAltName",
        altNames: [
          { type: 2, value: "localhost" },
          { type: 7, ip: "127.0.0.1" },
          { type: 7, ip: "::1" },
        ],
      },
    ]);
    futureCert.sign(keys.privateKey, forge.md.sha256.create());

    fs.writeFileSync(path.join(certsPath, "key.pem"), forge.pki.privateKeyToPem(keys.privateKey), { mode: 0o600 });
    fs.writeFileSync(path.join(certsPath, "cert.pem"), forge.pki.certificateToPem(futureCert));

    const result = generateCerts({ certsPath, ...OPTS });
    const cert = forge.pki.certificateFromPem(result.cert);
    expect(cert.validity.notBefore.getTime()).toBeLessThanOrEqual(Date.now() + 5 * 60 * 1000);
  });

  it("regenerates when CN is not localhost", () => {
    const certsPath = makeTmpDir();

    const keys = forge.pki.rsa.generateKeyPair(2048);
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = "03";
    cert.validity.notBefore = new Date(Date.now() - 60_000);
    cert.validity.notAfter = new Date(Date.now() + ONE_YEAR_MS);
    cert.setSubject([{ name: "commonName", value: "example.com" }]);
    cert.setIssuer([{ name: "commonName", value: "example.com" }]);
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

    fs.writeFileSync(path.join(certsPath, "key.pem"), forge.pki.privateKeyToPem(keys.privateKey), { mode: 0o600 });
    fs.writeFileSync(path.join(certsPath, "cert.pem"), forge.pki.certificateToPem(cert));

    const result = generateCerts({ certsPath, ...OPTS });
    const newCert = forge.pki.certificateFromPem(result.cert);
    expect(newCert.subject.getField("CN").value).toBe("localhost");
  });

  it("regenerates when SANs are missing", () => {
    const certsPath = makeTmpDir();

    const keys = forge.pki.rsa.generateKeyPair(2048);
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = "04";
    cert.validity.notBefore = new Date(Date.now() - 60_000);
    cert.validity.notAfter = new Date(Date.now() + ONE_YEAR_MS);
    cert.setSubject([{ name: "commonName", value: "localhost" }]);
    cert.setIssuer([{ name: "commonName", value: "localhost" }]);
    cert.setExtensions([
      {
        name: "subjectAltName",
        altNames: [{ type: 2, value: "localhost" }],
      },
    ]);
    cert.sign(keys.privateKey, forge.md.sha256.create());

    fs.writeFileSync(path.join(certsPath, "key.pem"), forge.pki.privateKeyToPem(keys.privateKey), { mode: 0o600 });
    fs.writeFileSync(path.join(certsPath, "cert.pem"), forge.pki.certificateToPem(cert));

    const result = generateCerts({ certsPath, ...OPTS });
    const newCert = forge.pki.certificateFromPem(result.cert);

    const san = newCert.getExtension("subjectAltName") as { altNames: { type: number; value?: string; ip?: string }[] };
    const ips = san.altNames.filter((a) => a.type === 7).map((a) => a.ip);
    expect(ips).toContain("127.0.0.1");
    expect(ips).toContain("::1");
  });

  it("regenerates when key size is too weak", () => {
    const certsPath = makeTmpDir();

    const keys = forge.pki.rsa.generateKeyPair(1024);
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = "05";
    cert.validity.notBefore = new Date(Date.now() - 60_000);
    cert.validity.notAfter = new Date(Date.now() + ONE_YEAR_MS);
    cert.setSubject([{ name: "commonName", value: "localhost" }]);
    cert.setIssuer([{ name: "commonName", value: "localhost" }]);
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

    fs.writeFileSync(path.join(certsPath, "key.pem"), forge.pki.privateKeyToPem(keys.privateKey), { mode: 0o600 });
    fs.writeFileSync(path.join(certsPath, "cert.pem"), forge.pki.certificateToPem(cert));

    const result = generateCerts({ certsPath, ...OPTS });
    const newCert = forge.pki.certificateFromPem(result.cert);
    const pubKey = newCert.publicKey as { n?: { bitLength?: () => number } };
    expect(pubKey.n?.bitLength?.()).toBeGreaterThanOrEqual(2048);
  });

  it("generates a positive non-zero serial number", () => {
    const certsPath = makeTmpDir();
    const { cert: certPem } = generateCerts({ certsPath, ...OPTS });
    const cert = forge.pki.certificateFromPem(certPem);

    expect(cert.serialNumber).toMatch(/^[0-9a-f]+$/i);
    expect(cert.serialNumber).not.toBe("0");
    const firstByte = Number.parseInt(cert.serialNumber.slice(0, 2), 16);
    expect((firstByte & 0x80) === 0).toBe(true);
  });
});
