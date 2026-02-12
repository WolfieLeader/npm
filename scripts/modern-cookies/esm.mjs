import http from "node:http";
import assert from "node:assert/strict";
import express from "express";
import { deleteCookie, getCookie, setCookie } from "modern-cookies";

assert.equal(typeof getCookie, "function");
assert.equal(typeof setCookie, "function");
assert.equal(typeof deleteCookie, "function");

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

console.log("modern-cookies: all ESM tests OK");
