import { isIP } from 'node:net';
import type { NextFunction, Request, Response } from 'express';

type NoneEmptyArray<T> = [T, ...T[]];

function $isIP(ip: unknown): ip is string {
  return typeof ip === 'string' && isIP(ip) !== 0;
}

const LOOKUP_HEADERS = [
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
  'cf-pseudo-ipv4',
];

function $extractIpFromHeaders(req: Request): NoneEmptyArray<string> | null {
  if ($isIP(req.ip)) return [req.ip];

  if (!req.headers) return null;
  if ($isIP(req.headers.forwarded)) return [req.headers.forwarded];

  for (let i = 0; i < LOOKUP_HEADERS.length; i++) {
    const ip = req.headers[LOOKUP_HEADERS[i] as string];
    if (!ip) continue;
    if (Array.isArray(ip)) {
      const filteredIps = ip.filter((item) => $isIP(item.trim()));
      if (filteredIps.length > 0) return filteredIps.map((item) => item.trim()) as NoneEmptyArray<string>;
    }

    if (typeof ip === 'string') {
      if ($isIP(ip.trim())) return [ip.trim()];
      if (!ip.includes(',')) continue;
      const filteredIps = ip.split(',').filter((ip) => $isIP(ip.trim()));
      if (filteredIps.length > 0) {
        return filteredIps.map((item) => item.trim()) as NoneEmptyArray<string>;
      }
    }
  }
  return null;
}

// biome-ignore-start lint/correctness/noUnusedFunctionParameters: Needed for Express middleware signature

/**
 * Middleware to extract the client IP address from the request.
 * This function checks various headers and the request socket to find the client's IP address.
 * It sets `req.clientIp` to the first valid IP address found and `req.clientIps` to an array of all valid IPs.
 * If no valid IP is found, these properties will not be set.
 */
export function getClientIp(req: Request, res?: Response, next?: NextFunction): string | undefined {
  if (!req) throw new Error('Request is undefined');

  const ips = $extractIpFromHeaders(req);
  if (ips && ips.length > 0) {
    req.clientIp = ips[0];
    req.clientIps = ips;
    next?.();
    return ips[0];
  }

  if ($isIP(req.socket.remoteAddress)) {
    req.clientIp = req.socket.remoteAddress;
    req.clientIps = [req.socket.remoteAddress];
    next?.();
    return req.socket.remoteAddress;
  }

  if ($isIP(req.connection.remoteAddress)) {
    req.clientIp = req.connection.remoteAddress;
    req.clientIps = [req.connection.remoteAddress];
    next?.();
    return req.connection.remoteAddress;
  }
}

// biome-ignore-end lint/correctness/noUnusedFunctionParameters: Needed for Express middleware signature

declare global {
  namespace Express {
    export interface Request {
      /** The first IP address extracted from the request headers */
      clientIp?: string;
      /** The array of all IP addresses extracted from the request headers */
      clientIps?: NoneEmptyArray<string>;
    }
  }
}
