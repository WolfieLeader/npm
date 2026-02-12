const http = require("node:http");
const assert = require("node:assert/strict");
const express = require("express");
const { deleteCookie, getCookie, setCookie } = require("modern-cookies");

assert.equal(typeof getCookie, "function");
assert.equal(typeof setCookie, "function");
assert.equal(typeof deleteCookie, "function");

(async () => {
  const app = express();
  app.get("/cookie", (_req, res) => {
    setCookie(res, "test", "value", { httpOnly: true });
    res.json({ ok: true });
  });

  const server = await new Promise((resolve) => {
    const s = http.createServer(app).listen(0, () => resolve(s));
  });
  const port = server.address().port;

  const res = await fetch(`http://127.0.0.1:${port}/cookie`);
  const setCookieHeader = res.headers.get("set-cookie");
  assert.ok(setCookieHeader?.includes("test=value"));

  server.close();

  console.log("modern-cookies: all CJS tests OK");
})();
