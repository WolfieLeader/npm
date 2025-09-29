import fs from "node:fs";
import path from "node:path";
import { $generateCerts } from "./generate";

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
 * ```
 */
export function generateCerts({ certsPath, activateLogs = true }: GenerateCertsOptions) {
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
    if ($isFileExists(certsPath, "key.pem") && $isFileExists(certsPath, "cert.pem")) {
      if (log) console.log("🔍 Found existing certificates for HTTPS.");
      return { key: $readFile(certsPath, "key.pem"), cert: $readFile(certsPath, "cert.pem") };
    }
  } catch (err) {
    throw new Error(
      `❌ Error checking for existing certificates: ${err instanceof Error ? err.message : "Unknown error"}`,
    );
  }
}

export function $isFileExists(dir: string, fileName: string) {
  return fs.existsSync(path.join(dir, fileName));
}

export function $readFile(dir: string, fileName: string) {
  if (!$isFileExists(dir, fileName)) throw new Error(`"${fileName}" not found.`);
  return fs.readFileSync(path.join(dir, fileName), "utf8");
}
