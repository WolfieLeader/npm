import crypto from "node:crypto";
import forge from "node-forge";
import { describe, expect, it } from "vitest";
import { $certificate, $tbsCertificate } from "~/certificate.js";

const hex = (bytes: Uint8Array): string => Buffer.from(bytes).toString("hex");

// Node and OpenSSL parse leniently: a BOOLEAN of 0x01, an explicit default, or a wrong unused-bit count still
// parses. A byte-exact comparison with an independent encoder catches those. RSA PKCS#1 v1.5 signatures are
// deterministic, so with the same key and the same TBS bytes the whole certificate must match.
describe("certificate DER matches node-forge byte for byte", () => {
  it.each([
    ["UTCTime validity", "2026-01-02T03:04:05Z", "2027-01-02T03:04:05Z"],
    ["GeneralizedTime from 2050", "2049-06-01T00:00:00Z", "2050-06-01T00:00:00Z"],
  ])("%s", (_label, from, to) => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs1", format: "pem" },
    });
    const serialHex = "0123456789abcdef0123456789abcdef";
    const notBefore = new Date(from);
    const notAfter = new Date(to);

    const ours = $tbsCertificate({
      serial: Buffer.from(serialHex, "hex"),
      notBefore,
      notAfter,
      commonName: "localhost",
      dnsNames: ["localhost"],
      ipAddresses: [Uint8Array.of(127, 0, 0, 1), Uint8Array.of(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1)],
      subjectPublicKeyInfo: crypto.createPublicKey(publicKey).export({ type: "spki", format: "der" }),
    });
    const ourCert = $certificate(ours, crypto.sign("sha256", ours, privateKey));

    // The certificate 4.0.0 built with node-forge, with the Common Name as a UTF8String like 4.1.0.
    const reference = forge.pki.createCertificate();
    reference.publicKey = forge.pki.publicKeyFromPem(publicKey);
    reference.serialNumber = serialHex;
    reference.validity.notBefore = notBefore;
    reference.validity.notAfter = notAfter;
    // @types/node-forge types valueTagClass as an ASN.1 class, but forge reads it as the universal type to write.
    const utf8 = forge.asn1.Type.UTF8 as unknown as forge.asn1.Class;
    const attrs = [{ name: "commonName", value: "localhost", valueTagClass: utf8 }];
    reference.setSubject(attrs);
    reference.setIssuer(attrs);
    reference.setExtensions([
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
    const forgeKey = forge.pki.privateKeyFromPem(privateKey);
    reference.sign(forgeKey, forge.md.sha256.create());
    const referenceDer = forge.asn1.toDer(forge.pki.certificateToAsn1(reference)).getBytes();

    expect(hex(ourCert)).toBe(Buffer.from(referenceDer, "binary").toString("hex"));
  });
});
