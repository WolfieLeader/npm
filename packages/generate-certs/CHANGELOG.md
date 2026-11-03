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
