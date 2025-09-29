import express, { type Router } from "express";
import { getClientIp } from "get-client-ip";
import { deleteCookie, getCookie, setCookie } from "modern-cookies";

export const router: Router = express.Router();

router.get("/", (_req, res) => {
  res.status(200).json({ message: "Hello World" });
});

router.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

router.get("/standalone-ip", (req, res) => {
  const ip = getClientIp(req);
  res.status(200).json({ ip });
});

router.get("/middleware-ip", getClientIp, (req, res) => {
  res.status(200).json({ ip: req.clientIp, ips: req.clientIps });
});

router.get("/cookie", (req, res) => {
  const cookie1 = getCookie(req, "cookie1");
  const cookie2 = getCookie(req, "cookie2");
  const cookie3 = getCookie(req, "cookie3");
  res.status(200).json({ cookie1, cookie2, cookie3 });
});

router.get("/set-cookie", (_req, res) => {
  setCookie(res, "cookie1", "SomeValue123", { httpOnly: true, maxAge: 60 });
  res.status(200).json({ message: "Cookie set" });
});

router.get("/set-cookies", (_req, res) => {
  setCookie(res, "cookie2", "anotherValue", { httpOnly: true, maxAge: 60 });
  setCookie(res, "cookie3", "yetAnotherValue", { httpOnly: true, maxAge: 60 });
  res.status(200).json({ message: "Another cookie set" });
});

router.get("/delete-cookie", (_req, res) => {
  deleteCookie(res, "cookie1", { httpOnly: true });
  deleteCookie(res, "cookie2", { httpOnly: true });
  res.status(200).json({ message: "Cookie cleared" });
});
