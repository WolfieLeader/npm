import assert from "node:assert/strict";
import path from "node:path";
import { generateCerts } from "generate-certs";

assert.equal(typeof generateCerts, "function");

const certs = generateCerts({ certsPath: path.join(import.meta.dirname, "certs") });
assert.ok(typeof certs.cert === "string" && certs.cert.length > 0);
assert.ok(typeof certs.key === "string" && certs.key.length > 0);

console.log("generate-certs: all ESM tests OK");
