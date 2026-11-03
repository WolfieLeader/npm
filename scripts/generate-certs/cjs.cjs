const assert = require("node:assert/strict");
const path = require("node:path");
const { generateCerts } = require("generate-certs");

assert.equal(typeof generateCerts, "function");

const certsPath = path.join(__dirname, "certs");
const certs = generateCerts({ certsPath });
assert.ok(typeof certs.cert === "string" && certs.cert.length > 0);
assert.ok(typeof certs.key === "string" && certs.key.length > 0);
assert.deepEqual(generateCerts({ certsPath }), certs, "a second call reuses the certificate");

console.log("generate-certs: all CJS tests OK");
