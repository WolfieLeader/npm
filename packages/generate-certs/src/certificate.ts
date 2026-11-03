// The X.509 v3 certificate this package writes (RFC 5280), as DER. Standard JavaScript only: the caller supplies
// the public key and the signature, so key generation and signing stay with the runtime's crypto.
import {
  $bitString,
  $explicit,
  $implicit,
  $oid,
  $octetString,
  $sequence,
  $set,
  $time,
  $unsignedInteger,
  $utf8String,
  $ascii,
  DER_NULL,
  DER_TRUE,
} from "./der.js";

const OID = {
  commonName: "2.5.4.3",
  sha256WithRSAEncryption: "1.2.840.113549.1.1.11",
  basicConstraints: "2.5.29.19",
  keyUsage: "2.5.29.15",
  extKeyUsage: "2.5.29.37",
  subjectAltName: "2.5.29.17",
  serverAuth: "1.3.6.1.5.5.7.3.1",
} as const;

export interface CertificateFields {
  /** Big-endian unsigned serial number. */
  serial: Uint8Array;
  notBefore: Date;
  notAfter: Date;
  /** Subject and issuer common name: the certificate is self-signed. */
  commonName: string;
  dnsNames: readonly string[];
  /** 4-byte IPv4 or 16-byte IPv6 addresses. */
  ipAddresses: readonly Uint8Array[];
  /** DER `SubjectPublicKeyInfo` of an RSA key. */
  subjectPublicKeyInfo: Uint8Array;
}

const SHA256_WITH_RSA = $sequence($oid(OID.sha256WithRSAEncryption), DER_NULL);

function $extension(oid: string, critical: boolean, value: Uint8Array): Uint8Array {
  return critical ? $sequence($oid(oid), DER_TRUE, $octetString(value)) : $sequence($oid(oid), $octetString(value));
}

// cA defaults to FALSE, and DER omits default values, so the value is an empty sequence.
const BASIC_CONSTRAINTS = $extension(OID.basicConstraints, true, $sequence());
// digitalSignature (bit 0) and keyEncipherment (bit 2): 0b101 followed by 5 unused bits.
const KEY_USAGE_BITS = $bitString(Uint8Array.of(0xa0), 5);
const KEY_USAGE = $extension(OID.keyUsage, true, KEY_USAGE_BITS);
const SERVER_AUTH = $sequence($oid(OID.serverAuth));
const EXTENDED_KEY_USAGE = $extension(OID.extKeyUsage, false, SERVER_AUTH);
const VERSION_3 = $explicit(0, $unsignedInteger(Uint8Array.of(2)));

function $extensions(fields: CertificateFields): Uint8Array {
  const dnsNames = fields.dnsNames.map((name) => $implicit(2, $ascii(name)));
  const ipAddresses = fields.ipAddresses.map((address) => $implicit(7, address));
  const subjectAltName = $extension(OID.subjectAltName, false, $sequence(...dnsNames, ...ipAddresses));
  return $explicit(3, $sequence(BASIC_CONSTRAINTS, KEY_USAGE, EXTENDED_KEY_USAGE, subjectAltName));
}

function $name(commonName: string): Uint8Array {
  const attribute = $sequence($oid(OID.commonName), $utf8String(commonName));
  return $sequence($set(attribute));
}

/** The DER `TBSCertificate`: the bytes the issuer signs. */
export function $tbsCertificate(fields: CertificateFields): Uint8Array {
  const name = $name(fields.commonName);
  const validity = $sequence($time(fields.notBefore), $time(fields.notAfter));
  return $sequence(
    VERSION_3,
    $unsignedInteger(fields.serial),
    SHA256_WITH_RSA,
    name,
    validity,
    name,
    fields.subjectPublicKeyInfo,
    $extensions(fields),
  );
}

/** The DER `Certificate`: `tbs` with its sha256WithRSAEncryption `signature`. */
export function $certificate(tbs: Uint8Array, signature: Uint8Array): Uint8Array {
  return $sequence(tbs, SHA256_WITH_RSA, $bitString(signature));
}
