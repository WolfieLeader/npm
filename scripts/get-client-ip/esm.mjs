import http from "node:http";
import assert from "node:assert/strict";
import express from "express";
import { getClientIp } from "get-client-ip";

assert.equal(typeof getClientIp, "function");

const app = express();
app.get("/ip", (req, res) => {
  const ip = getClientIp(req);
  res.json({ ip });
});

const server = await new Promise((resolve) => {
  const s = http.createServer(app).listen(0, () => resolve(s));
});
const port = server.address().port;

const res = await fetch(`http://127.0.0.1:${port}/ip`);
const data = await res.json();
assert.equal(typeof data.ip, "string");

server.close();

console.log("get-client-ip: all ESM tests OK");
