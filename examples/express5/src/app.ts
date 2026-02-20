import path from "node:path";
import express from "express";
import { generateCerts } from "generate-certs";
import { getClientIp } from "get-client-ip";
import { getCookie, setCookie } from "modern-cookies";

export function createApp() {
  const app = express();

  app.get("/", (_req, res) => {
    res.send("OK");
  });

  app.get("/ip", (req, res) => {
    const ip = getClientIp(req);
    res.json({ ip });
  });

  app.get("/cookie", (_req, res) => {
    setCookie(res, "demo", "hello-express5", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 86400,
      path: "/",
    });
    res.json({ message: "Cookie 'demo' set" });
  });

  app.get("/cookie/:name", (req, res) => {
    const name = req.params.name;
    const value = getCookie(req, name);
    res.json({ name, value: value ?? null });
  });

  app.get("/certs", (_req, res) => {
    const certs = generateCerts({
      certsPath: path.resolve(import.meta.dirname, "..", "certs"),
    });
    res.json({
      message: "Certificates generated",
      certLength: certs.cert.length,
      keyLength: certs.key.length,
    });
  });

  return app;
}
