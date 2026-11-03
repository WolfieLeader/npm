import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { generateCerts } from "generate-certs";

assert.equal(typeof generateCerts, "function");

const certs = generateCerts({ certsPath: fileURLToPath(new URL("certs", import.meta.url)) });
assert.ok(typeof certs.cert === "string" && certs.cert.length > 0);
assert.ok(typeof certs.key === "string" && certs.key.length > 0);

console.log("generate-certs: all ESM tests OK");
