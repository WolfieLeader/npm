import { isIP } from 'node:net';
import type { NextFunction, Request, Response } from 'express';

const $isIP = (ip: unknown): ip is string => typeof ip === 'string' && isIP(ip) !== 0;

const headers = [
  'x-client-ip',
  'x-forwarded-for',
  'forwarded-for',
  'x-forwarded',
  'x-real-ip',
  'cf-connecting-ip',
  'true-client-ip',
  'x-cluster-client-ip',
  'fastly-client-ip',
  'x-appengine-user-ip',
  'Cf-Pseudo-IPv4',
];

function $extractIpFromHeaders(req: Request): [string, ...string[]] | null {
  if ($isIP(req.ip)) return [req.ip];

  if (!req.headers) return null;
  if ($isIP(req.headers.forwarded)) return [req.headers.forwarded];

  for (let i = 0; i < headers.length; i++) {
    const ip = req.headers[headers[i] as string];
    if (!ip) continue;
    if (Array.isArray(ip)) {
      const filteredIps = ip.filter((item) => $isIP(item.trim()));
      if (filteredIps.length > 0) return filteredIps.map((item) => item.trim()) as [string, ...string[]];
    }

    if (typeof ip === 'string') {
      if ($isIP(ip.trim())) return [ip.trim()];
      if (!ip.includes(',')) continue;
      const filteredIps = ip.split(',').filter((ip) => $isIP(ip.trim()));
      if (filteredIps.length > 0) {
        return filteredIps.map((item) => item.trim()) as [string, ...string[]];
      }
    }
  }
  return null;
}

/**
 * Middleware to extract the client IP address from the request.
 * This function checks various headers and the request socket to find the client's IP address.
 * It sets `req.clientIp` to the first valid IP address found and `req.clientIps` to an array of all valid IPs.
 * If no valid IP is found, these properties will not be set.
 */
export function getClientIp(req: Request, response?: Response, next?: NextFunction) {
  if (!req) throw new Error('Request is undefined');

  const ips = $extractIpFromHeaders(req);
  if (ips && ips.length > 0) {
    req.clientIp = ips[0];
    req.clientIps = ips;
    if (next) next();
    return;
  }

  if ($isIP(req.socket.remoteAddress)) {
    req.clientIp = req.socket.remoteAddress;
    req.clientIps = [req.socket.remoteAddress];
    if (next) next();
    return;
  }

  if ($isIP(req.connection.remoteAddress)) {
    req.clientIp = req.connection.remoteAddress;
    req.clientIps = [req.connection.remoteAddress];
    if (next) next();
    return;
  }
}

declare global {
  namespace Express {
    export interface Request {
      /** The first IP address extracted from the request headers */
      clientIp?: string;
      /** The array of all IP addresses extracted from the request headers */
      clientIps?: [string, ...string[]];
    }
  }
}
