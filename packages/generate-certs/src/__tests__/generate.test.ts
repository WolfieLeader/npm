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

    fs.writeFileSync(path.join(certsPath, "key.pem"), forge.pki.privateKeyToPem(keys.privateKey));
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

  it("throws on corrupt cert file", () => {
    const certsPath = makeTmpDir();

    fs.writeFileSync(path.join(certsPath, "key.pem"), "not-a-pem");
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
});
