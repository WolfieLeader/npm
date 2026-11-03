# Changelog

## 4.1.0

- Drops `node-forge`. Node's `crypto` makes and signs the key, and a small DER encoder writes the certificate, so there are no runtime dependencies.
- The Common Name is a `UTF8String` instead of a `PrintableString`, serial numbers are always minimal DER, and PEM lines end with `\n` instead of `\r\n`.
- Supports Node.js 20 and later, and is tested on Bun and Deno 2.

## 4.0.0

Breaking changes:

- **Requires Node.js >= 22.12.**
- **`activateLogs` is replaced by `logger`.** Logging is off by default. Pass `logger: console.log` to restore the v3 output.
- **The Common Name is no longer checked.** Valid certificates with other CNs, or none, are kept instead of replaced.
- **CA-issued certificates are kept.** v3 required a self-signature and replaced mkcert-style certificates.
- **An insecure `key.pem` mode is fixed, not replaced.** The key keeps its content and gets mode `600`. If the mode cannot be changed, `generateCerts` throws.
- **Invalid files are backed up before regeneration** as `*.bak`.
- **Existing certificates are validated with `node:crypto`** (`X509Certificate`), so EC and Ed25519 key pairs are accepted.
- **Generated certificates carry `basicConstraints`, `keyUsage`, and `extKeyUsage`.**
- **`node-forge` is `^1.4.2`**, which fixes the October 2026 advisories (including PEM ReDoS and signature forgery).

## 3.0.0

Breaking changes:

- **`certsPath` must be absolute.** A relative path throws.
- **Existing certificates are checked and replaced when a check fails.** `generateCerts` regenerates when the certificate is expired or not yet valid, its Common Name is not `localhost`, its SANs lack `localhost`, `127.0.0.1`, or `::1`, its RSA key is under 2048 bits, the key does not match, or the self-signature fails. Outside Windows, it also regenerates when `key.pem` has any group or other permissions. 2.x reused any `key.pem` and `cert.pem` pair. 2.x certificates have no SANs, so 3.0 replaces them on first run.
- **`$isFileExists` and `$readFile` are no longer exported.**
- **Requires Node.js >= 18.** Earlier versions declared no `engines`.

Other changes:

- Regeneration no longer deletes the directory. 1.x and 2.x removed `certsPath` and everything in it before writing new files.
- Generated certificates carry the SANs `localhost`, `127.0.0.1`, and `::1`, a random 16-byte serial number instead of `01`, and a start time 5 minutes in the past.
- `key.pem` is written with mode `600`. Files are written atomically, and a lock file serializes concurrent calls.

## 2.1.0

- No API changes. Log and error wording changes, and the README adds Hono and Fastify examples.

## 2.0.0

Breaking changes:

- **Options are renamed.** `certsDir` becomes `certsPath`, and `log` becomes `activateLogs` (default `true`).

Other changes:

- Error messages include the underlying cause.
- The internal helpers `$isFileExists` and `$readFile` are exported. 3.0.0 removes them.

## 1.1.0

Breaking changes:

- **`generateCerts` is a named export.** Replace `import generateCerts from "generate-certs"` with `import { generateCerts } from "generate-certs"`.

## 1.0.0

- First release. `generateCerts({ certsDir, log })` returns PEM `key` and `cert` strings.
- It reuses `key.pem` and `cert.pem` in `certsDir` when both exist. Otherwise it writes a self-signed RSA 2048, SHA-256 certificate for `localhost`, valid for one year.
- Before it writes new files, it deletes `certsDir` and everything in it.
