import fs from "node:fs";
import path from "node:path";
import { $checkCerts, $secureKeyMode } from "./check.js";
import { $backupFile, $generateCerts } from "./generate.js";
import { $withLock } from "./lock.js";

/** Options for generating self-signed HTTPS certificates. */
export interface GenerateCertsOptions {
  /**
   * The absolute path to the directory where the certificate files will be stored or retrieved.
   * Must be a valid, writable directory path.
   */
  certsPath: string;
  /**
   * Receives one line per notable event (reuse, permission fix, backup, generation).
   * Silent when omitted. Pass `console.log` to print them.
   */
  logger?: (message: string) => void;
}

/** PEM-encoded key and certificate, ready for `https.createServer()`. */
export interface GeneratedCerts {
  key: string;
  cert: string;
}

function $reuseOrRegenerate(dir: string, log: (message: string) => void): GeneratedCerts {
  const keyPath = path.join(dir, "key.pem");
  const certPath = path.join(dir, "cert.pem");
  const check = $checkCerts(dir);

  if (check.status === "valid") {
    if ($secureKeyMode(keyPath)) log("Changed key.pem permissions to 600.");
    log("Found existing certificates for HTTPS.");
    return { key: check.key, cert: check.cert };
  }

  if (check.status === "invalid") {
    // Never overwrite files without a copy: they may be the user's own certificates.
    const backups = [$backupFile(keyPath), $backupFile(certPath)].filter((file) => file !== undefined);
    log(`${check.reason}. Regenerating. Backups: ${backups.join(", ")}`);
  }

  try {
    $generateCerts(dir);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Error generating certificates: ${reason}`, { cause: error });
  }
  log("Generated HTTPS certificates. In the browser, choose 'Advanced' -> 'Proceed to localhost (unsafe)'.");
  return { key: fs.readFileSync(keyPath, "utf8"), cert: fs.readFileSync(certPath, "utf8") };
}

/**
 * Generates or retrieves self-signed HTTPS certificates from the specified directory.
 *
 * Valid existing `key.pem` and `cert.pem` files are reused, including CA-issued ones (e.g. from mkcert).
 * A readable-by-others `key.pem` is changed to mode 600 instead of being replaced.
 * Before replacing invalid files, the function copies them to `*.bak`; it never overwrites an older backup.
 *
 * @param options - Options to control the certificate generation behavior.
 * @returns The PEM-formatted `key` and `cert` strings.
 *
 * @throws Will throw an error if the path is invalid, inaccessible, or certificate generation fails.
 *
 * @example
 * ```ts
 * const certs = generateCerts({ certsPath: path.resolve(import.meta.dirname, "certs"), logger: console.log });
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
export function generateCerts({ certsPath, logger }: GenerateCertsOptions): GeneratedCerts {
  if (!path.isAbsolute(certsPath)) {
    throw new Error("Error generating certificates: certsPath must be an absolute path");
  }

  fs.mkdirSync(certsPath, { recursive: true });
  const log = logger ?? (() => {});
  return $withLock(certsPath, () => $reuseOrRegenerate(certsPath, log));
}
