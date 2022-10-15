import { Request } from "express";
import { isIPv4, isIPv6, isIP } from "./validate";

const ipv4Map = new Map<string, number>();
const ipv6Map = new Map<string, number>();

const insertIP = (ip: unknown): void => {
  if (!ip) return;
  if (typeof ip !== "string") return;
  if (!isIP(ip)) return;
  if (isIPv4(ip)) {
    const count = ipv4Map.get(ip) || 0;
    ipv4Map.set(ip, count + 1);
  }
  if (isIPv6(ip)) {
    const count = ipv6Map.get(ip) || 0;
    ipv6Map.set(ip, count + 1);
  }
};

export const getIp = (req: Request) => {
  if (!req) throw new Error("Request is undefined");
  let res = {};
  if (req.headers) {
    res = {
      ...res,
      "x-client-ip": req.headers["x-client-ip"],
      "x-forwarded-for": req.headers["x-forwarded-for"],
      "forwarded-for": req.headers["forwarded-for"],
      "x-forwarded": req.headers["x-forwarded"],
      forwarded: req.headers.forwarded,
      "x-real-ip": req.headers["x-real-ip"],
      "cf-connecting-ip": req.headers["cf-connecting-ip"],
      "fastly-client-ip": req.headers["fastly-client-ip"],
      "true-client-ip": req.headers["true-client-ip"],
      "x-cluster-client-ip": req.headers["x-cluster-client-ip"],
      "x-appengine-user-ip": req.headers["x-appengine-user-ip"],
      "Cf-Pseudo-IPv4": req.headers["Cf-Pseudo-IPv4"],
    };
  }
  if (req.socket) {
    res = {
      ...res,
      "socket.remoteAddress": req.socket.remoteAddress,
    };
  }
  return res;
};
