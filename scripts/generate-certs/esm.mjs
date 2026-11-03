import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { generateCerts } from "generate-certs";

assert.equal(typeof generateCerts, "function");

const certsPath = fileURLToPath(new URL("certs", import.meta.url));
const certs = generateCerts({ certsPath });
assert.ok(typeof certs.cert === "string" && certs.cert.length > 0);
assert.ok(typeof certs.key === "string" && certs.key.length > 0);
assert.deepEqual(generateCerts({ certsPath }), certs, "a second call reuses the certificate");

console.log("generate-certs: all ESM tests OK");
