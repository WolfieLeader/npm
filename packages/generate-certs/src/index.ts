import fs from "node:fs";
import path from "node:path";
import forge from "node-forge";
import { $generateCerts } from "./generate.js";

/** Options for generating self-signed HTTPS certificates. */
export interface GenerateCertsOptions {
  /**
   * The absolute path to the directory where the certificate files will be stored or retrieved.
   * Must be a valid, writable directory path.
   */
  certsPath: string;
  /**
   * Whether to log the generation process to the console.
   * Defaults to true, which logs success messages.
   */
  activateLogs?: boolean;
}

/**
 * Generates or retrieves self-signed HTTPS certificates from the specified directory.
 *
 * If valid `key.pem` and `cert.pem` files already exist in the target path,
 * they will be reused. Otherwise, new certificates will be generated.
 * Examples are provided for various frameworks and shown in the documentation.
 *
 * @param options - Options to control the certificate generation behavior.
 * @returns An object containing the PEM-formatted `key` and `cert` strings.
 *
 * @throws Will throw an error if the path is invalid, inaccessible, or certificate generation fails.
 *
 * @example
 * ```ts
 * const certs = generateCerts({ certsPath: path.resolve(__dirname, 'certs') });
 *
 * // Express example:
 * https.createServer(certs, app);
 *
 * // NestJS example:
 * const app = await NestFactory.create(AppModule, { httpsOptions: certs });
 *
 * // HonoJS example:
 * serve({ fetch: app.fetch, port: 3443, createServer: createSecureServer, serverOptions: certs })
 *
 * // Fastify example:
 * const app = Fastify({ https: certs });
 * ```
 */
export function generateCerts({ certsPath, activateLogs = true }: GenerateCertsOptions) {
  if (!path.isAbsolute(certsPath)) {
    throw new Error("❌ Error generating certificates: certsPath must be an absolute path");
  }

  const certs = $checkForCerts({ certsPath, activateLogs });
  if (certs) return certs;
  try {
    $generateCerts(certsPath);
    if (activateLogs) {
      console.log("🔐 Certificates for HTTPS have been generated successfully!");
      console.log(`🛑 Please visit the URL, click on 'Advanced' -> 'Proceed to localhost(unsafe)' to continue.`);
    }
    return { key: $readFile(certsPath, "key.pem"), cert: $readFile(certsPath, "cert.pem") };
  } catch (err) {
    throw new Error(`❌ Error generating certificates: ${err instanceof Error ? err.message : "Unknown error"}`);
  }
}

function $checkForCerts({ certsPath, activateLogs: log = true }: GenerateCertsOptions) {
  try {
    const keyPem = $readFile(certsPath, "key.pem");
    const certPem = $readFile(certsPath, "cert.pem");

    if (process.platform !== "win32") {
      const keyStats = fs.statSync(path.join(certsPath, "key.pem"));
      if ((keyStats.mode & 0o777) !== 0o600) {
        if (log) console.log("⚠️ Private key has insecure permissions. Regenerating...");
        return;
      }
    }

    const cert = forge.pki.certificateFromPem(certPem);
    const now = Date.now();
    const clockSkewMs = 5 * 60 * 1000;

    if (cert.validity.notAfter.getTime() <= now + clockSkewMs) {
      if (log) console.log("⏰ Existing certificate has expired. Regenerating...");
      return;
    }

    if (cert.validity.notBefore.getTime() > now + clockSkewMs) {
      if (log) console.log("⏳ Existing certificate is not valid yet. Regenerating...");
      return;
    }

    const commonName = cert.subject.getField("CN")?.value;
    if (commonName !== "localhost") {
      if (log) console.log("🏷️ Certificate common name is invalid. Regenerating...");
      return;
    }

    const san = cert.getExtension("subjectAltName") as
      | { altNames?: Array<{ type: number; value?: string; ip?: string }> }
      | undefined;
    const hasLocalhostDns = san?.altNames?.some((entry) => entry.type === 2 && entry.value === "localhost") ?? false;
    const hasLoopbackV4 = san?.altNames?.some((entry) => entry.type === 7 && entry.ip === "127.0.0.1") ?? false;
    const hasLoopbackV6 = san?.altNames?.some((entry) => entry.type === 7 && entry.ip === "::1") ?? false;

    if (!(hasLocalhostDns && hasLoopbackV4 && hasLoopbackV6)) {
      if (log) console.log("🌐 Certificate SAN entries are invalid. Regenerating...");
      return;
    }

    const certRsaPublic = cert.publicKey as { n?: { bitLength?: () => number } };
    const bitLength = certRsaPublic.n?.bitLength?.();
    if (typeof bitLength !== "number" || bitLength < 2048) {
      if (log) console.log("🔐 Certificate key size is too weak. Regenerating...");
      return;
    }

    const privateKey = forge.pki.privateKeyFromPem(keyPem);
    const certPublicKey = forge.pki.publicKeyToPem(cert.publicKey);
    const keyPublicKey = forge.pki.publicKeyToPem(forge.pki.setRsaPublicKey(privateKey.n, privateKey.e));
    if (certPublicKey !== keyPublicKey) {
      if (log) console.log("🔑 Key/certificate mismatch detected. Regenerating...");
      return;
    }

    if (log) console.log("🔍 Found existing certificates for HTTPS.");
    return { key: keyPem, cert: certPem };
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") return;
    throw new Error(
      `❌ Error checking for existing certificates: ${err instanceof Error ? err.message : "Unknown error"}`,
    );
  }
}

function $readFile(dir: string, fileName: string) {
  return fs.readFileSync(path.join(dir, fileName), "utf8");
}
