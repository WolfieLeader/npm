import { createPrivateKey, X509Certificate } from "node:crypto";
import type { KeyObject } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { $errorCode } from "./error-code.js";

const CLOCK_SKEW_MS = 5 * 60 * 1000;

/** Result of inspecting `key.pem` and `cert.pem`. */
export type CertCheck =
  | { status: "valid"; key: string; cert: string }
  | { status: "missing" }
  | { status: "invalid"; reason: string };

function $readIfExists(filePath: string): string | undefined {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    if ($errorCode(error) === "ENOENT") return undefined;
    const reason = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Error checking for existing certificates: ${reason}`, { cause: error });
  }
}

function $validityProblem(cert: X509Certificate, now: number): string | undefined {
  // `validFromDate` and `validToDate` need Node 22.10. The strings exist on every supported runtime.
  const from = Date.parse(cert.validFrom);
  const to = Date.parse(cert.validTo);
  // NaN fails every comparison, so an unreadable date would otherwise pass as valid.
  if (Number.isNaN(from) || Number.isNaN(to)) return "Existing certificate has an unreadable validity period";
  if (to <= now + CLOCK_SKEW_MS) return "Existing certificate has expired";
  if (from > now + CLOCK_SKEW_MS) return "Existing certificate is not valid yet";
  return undefined;
}

function $sanProblem(cert: X509Certificate): string | undefined {
  const hasNames =
    cert.checkHost("localhost", { subject: "never" }) !== undefined &&
    cert.checkIP("127.0.0.1") !== undefined &&
    cert.checkIP("::1") !== undefined;
  return hasNames ? undefined : "Certificate SANs do not cover localhost, 127.0.0.1, and ::1";
}

function $keyProblem(cert: X509Certificate, privateKey: KeyObject): string | undefined {
  const { asymmetricKeyType, asymmetricKeyDetails } = cert.publicKey;
  const isRsa = asymmetricKeyType === "rsa" || asymmetricKeyType === "rsa-pss";
  if (isRsa && (asymmetricKeyDetails?.modulusLength ?? 0) < 2048) return "Certificate key is weaker than RSA 2048";
  if (!cert.checkPrivateKey(privateKey)) return "key.pem does not match cert.pem";
  return undefined;
}

/** Self-issued certificates must verify against their own key. CA-issued ones (e.g. mkcert) are accepted. */
function $signatureProblem(cert: X509Certificate): string | undefined {
  if (!cert.checkIssued(cert)) return undefined;
  return cert.verify(cert.publicKey) ? undefined : "Certificate self-signature is invalid";
}

function $validatePair(keyPem: string, certPem: string): string | undefined {
  let cert: X509Certificate;
  let privateKey: KeyObject;
  try {
    cert = new X509Certificate(certPem);
    privateKey = createPrivateKey(keyPem);
  } catch {
    return "Existing certificate or key is corrupt or unreadable";
  }
  return (
    $validityProblem(cert, Date.now()) ?? $sanProblem(cert) ?? $keyProblem(cert, privateKey) ?? $signatureProblem(cert)
  );
}

/** Inspects `key.pem` and `cert.pem` in `dir`. Throws on read errors other than a missing file. */
export function $checkCerts(dir: string): CertCheck {
  const key = $readIfExists(path.join(dir, "key.pem"));
  const cert = $readIfExists(path.join(dir, "cert.pem"));
  if (key === undefined && cert === undefined) return { status: "missing" };
  if (key === undefined || cert === undefined)
    return { status: "invalid", reason: "Only one of key.pem and cert.pem exists" };

  const reason = $validatePair(key, cert);
  return reason === undefined ? { status: "valid", key, cert } : { status: "invalid", reason };
}

/** Restricts `key.pem` to its owner (mode 600). Returns `true` when the mode was changed. No-op on Windows. */
export function $secureKeyMode(keyPath: string): boolean {
  if (process.platform === "win32") return false;
  if ((fs.statSync(keyPath).mode & 0o077) === 0) return false;
  try {
    fs.chmodSync(keyPath, 0o600);
  } catch (error) {
    throw new Error("Error securing key.pem: it is readable by others and its mode cannot be changed to 600", {
      cause: error,
    });
  }
  return true;
}
