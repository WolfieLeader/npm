// ESM functional tests — encrypt/decrypt, hashing, compression, certs, Express integration.
import http from "node:http";
import { createSecretKey, decrypt, encrypt, tryHash } from "cipher-kit/node";
import { compress, decompress } from "compress-kit";
import express from "express";
import { generateCerts } from "generate-certs";
import { getClientIp } from "get-client-ip";
import { setCookie } from "modern-cookies";

function assert(condition, label) {
  if (!condition) {
    console.error(`FAIL: ${label}`);
    process.exit(1);
  }
}

// cipher-kit: encrypt → decrypt roundtrip
const key = createSecretKey("smoke-test-secret");
const plaintext = "Hello from ESM smoke test!";
const encrypted = encrypt(plaintext, key);
const decrypted = decrypt(encrypted, key);
assert(decrypted === plaintext, "encrypt/decrypt roundtrip");

// cipher-kit: tryHash returns success
const hashResult = tryHash("smoke-test-data");
assert(hashResult.success === true, "tryHash returns success");
assert(typeof hashResult.result === "string" && hashResult.result.length > 0, "tryHash produces a hash");

// compress-kit: compress → decompress roundtrip
const original = "Hello from ESM smoke test — compress roundtrip!";
const compressed = compress(original);
const decompressed = decompress(compressed);
assert(decompressed === original, "compress/decompress roundtrip");

// generate-certs: verify it returns cert + key
const certs = generateCerts({ certsPath: "/tmp/smoke-certs", activateLogs: false });
assert(typeof certs.cert === "string" && certs.cert.length > 0, "generateCerts returns cert");
assert(typeof certs.key === "string" && certs.key.length > 0, "generateCerts returns key");

// Express integration: getClientIp + modern-cookies on a real HTTP server
const app = express();
app.get("/ip", (req, res) => {
  const ip = getClientIp(req);
  res.json({ ip });
});
app.get("/cookie", (_req, res) => {
  setCookie(res, "test", "value", { httpOnly: true });
  res.json({ ok: true });
});

const server = await new Promise((resolve) => {
  const s = http.createServer(app).listen(0, () => resolve(s));
});
const port = server.address().port;

// Test getClientIp via real HTTP
const ipRes = await fetch(`http://127.0.0.1:${port}/ip`);
const ipData = await ipRes.json();
assert(typeof ipData.ip === "string", "getClientIp returns IP via Express");

// Test setCookie via real HTTP
const cookieRes = await fetch(`http://127.0.0.1:${port}/cookie`);
const setCookieHeader = cookieRes.headers.get("set-cookie");
assert(setCookieHeader?.includes("test=value"), "setCookie sets header via Express");

server.close();

console.log("esm.mjs: all functional tests OK");
