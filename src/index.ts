import { isIP } from "net";
import { Request } from "express";

const isValidIP = (ip: unknown): boolean => {
  if (!ip || typeof ip !== "string") return false;
  if (isIP(ip) === 4 || isIP(ip) === 6) return true;
  return false;
};

const getIPFromHeaders = (req: Request): string[] | null => {
  const potentialHeaders = [
    "x-client-ip",
    "x-forwarded-for",
    "forwarded-for",
    "x-forwarded",
    "x-real-ip",
    "cf-connecting-ip",
    "true-client-ip",
    "x-cluster-client-ip",
    "fastly-client-ip",
    "x-appengine-user-ip",
    "Cf-Pseudo-IPv4",
  ];
  if (!req.headers) return null;
  if (req.headers.forwarded && isValidIP(req.headers.forwarded)) return [req.headers.forwarded];
  for (const header of potentialHeaders) {
    const ipOrIps = req.headers[header];
    if (ipOrIps) {
      if (Array.isArray(ipOrIps)) {
        const filteredIps = ipOrIps.filter((ip) => isValidIP(ip));
        if (filteredIps.length > 0) return filteredIps;
      }
      if (typeof ipOrIps === "string") {
        if (ipOrIps.includes(",")) {
          const filteredIps = ipOrIps.split(",").filter((ip) => isValidIP(ip.trim()));
          if (filteredIps.length > 0) return filteredIps;
        }
        if (isValidIP(ipOrIps)) return [ipOrIps];
      }
    }
  }
  return null;
};

const getClientIp = (req: Request): string | null => {
  if (!req) throw new Error("Request is undefined");
  const ips = getIPFromHeaders(req);
  if (ips && ips.length > 0) return ips[0];
  if (req.socket && req.socket.remoteAddress && isValidIP(req.socket.remoteAddress)) return req.socket.remoteAddress;
  if (req.connection && req.connection.remoteAddress && isValidIP(req.connection.remoteAddress))
    return req.connection.remoteAddress;
  return null;
};

export default getClientIp;
