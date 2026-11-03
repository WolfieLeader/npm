import { execFileSync, spawnSync } from "node:child_process";
import { X509Certificate } from "node:crypto";
import { once } from "node:events";
import fs from "node:fs";
import https from "node:https";
import type { AddressInfo } from "node:net";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { generateCerts } from "../index.js";

/** Whether this host can listen on `address`. Some containers have no IPv6 loopback. */
async function $canListen(address: string): Promise<boolean> {
  const server = net.createServer();
  try {
    server.listen(0, address);
    await once(server, "listening");
    return true;
  } catch {
    return false;
  } finally {
    server.close();
  }
}

const hasIpv6Loopback = await $canListen("::1");

// Other tools must accept what the hand-written DER encoder produces: Node's TLS stack and OpenSSL.
describe("generated certificates interoperate", () => {
  let dir: string;
  let cert: string;
  let key: string;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "gen-certs-interop-"));
    ({ cert, key } = generateCerts({ certsPath: dir }));
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  /** Serves HTTPS with the generated pair on `listenHost` and requests it, trusting only the generated cert. */
  async function $request(listenHost: string, servername?: string): Promise<number> {
    const server = https.createServer({ cert, key }, (_req, res) => res.end("ok"));
    server.listen(0, listenHost);
    await once(server, "listening");
    const { port } = server.address() as AddressInfo;
    try {
      return await new Promise<number>((resolve, reject) => {
        const options = { host: listenHost, port, ca: cert, ...(servername === undefined ? {} : { servername }) };
        https
          .get(options, (res) => {
            res.resume();
            resolve(res.statusCode ?? 0);
          })
          .on("error", reject);
      });
    } finally {
      server.close();
    }
  }

  // A TLS client trusts a root without checking its own signature, so the handshake test cannot catch a bad one.
  it("carries a valid self-signature", () => {
    const parsed = new X509Certificate(cert);
    expect(parsed.verify(parsed.publicKey)).toBe(true);
    expect(parsed.subject).toBe(parsed.issuer);
  });

  it("is valid from 5 minutes ago for one year", () => {
    const { validFromDate, validToDate } = new X509Certificate(cert);
    const now = Date.now();
    expect(validFromDate.getTime()).toBeLessThanOrEqual(now - 4 * 60 * 1000);
    expect(validFromDate.getTime()).toBeGreaterThan(now - 6 * 60 * 1000);
    const days = (validToDate.getTime() - validFromDate.getTime()) / 86_400_000;
    expect([365, 366]).toContain(days);
  });

  it("completes a verified TLS handshake for localhost and 127.0.0.1", async () => {
    expect(await $request("127.0.0.1", "localhost")).toBe(200);
    expect(await $request("127.0.0.1")).toBe(200);
  });

  it.skipIf(!hasIpv6Loopback)("completes a verified TLS handshake for ::1", async () => {
    expect(await $request("::1")).toBe(200);
  });

  it("fails the handshake for a name the certificate does not cover", async () => {
    await expect($request("127.0.0.1", "example.com")).rejects.toMatchObject({ code: "ERR_TLS_CERT_ALTNAME_INVALID" });
  });

  it.skipIf(spawnSync("openssl", ["version"]).status !== 0)("is read by OpenSSL with the expected fields", () => {
    const text = execFileSync("openssl", ["x509", "-noout", "-text"], { input: cert }).toString();
    expect(text).toContain("Version: 3 (0x2)");
    expect(text).toContain("Signature Algorithm: sha256WithRSAEncryption");
    // OpenSSL 3 prints "CN = localhost"; OpenSSL 4 prints "CN=localhost".
    expect(text).toMatch(/Subject: CN ?= ?localhost/);
    expect(text).toMatch(/Issuer: CN ?= ?localhost/);
    expect(text).toContain("Public-Key: (2048 bit)");
    expect(text).toMatch(/Basic Constraints: critical\s+CA:FALSE/);
    expect(text).toMatch(/Key Usage: critical\s+Digital Signature, Key Encipherment/);
    expect(text).toMatch(/Extended Key Usage:\s+TLS Web Server Authentication/);
    expect(text).toMatch(
      /Subject Alternative Name:\s+DNS:localhost, IP Address:127\.0\.0\.1, IP Address:0:0:0:0:0:0:0:1/,
    );
  });
});
