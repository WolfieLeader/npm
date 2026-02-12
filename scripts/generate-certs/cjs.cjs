const assert = require("node:assert/strict");
const { generateCerts } = require("generate-certs");

assert.equal(typeof generateCerts, "function");

const certs = generateCerts({ certsPath: "/tmp/smoke-certs", activateLogs: false });
assert.ok(typeof certs.cert === "string" && certs.cert.length > 0);
assert.ok(typeof certs.key === "string" && certs.key.length > 0);

console.log("generate-certs: all CJS tests OK");
