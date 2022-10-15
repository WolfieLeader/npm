import { Request } from "express";

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
