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
 * Extracts the client's IP address from an incoming Express request.
 *
 * This function works both as a standalone utility and as Express middleware.
 * It attempts to detect the IP by inspecting common proxy-related headers
 * such as `x-forwarded-for`, `x-real-ip`, and others. If no valid IP is found
 * in the headers, it falls back to `req.socket.remoteAddress` or `req.connection.remoteAddress`.
 *
 * When used as middleware, it populates:
 * - `req.clientIp`: The first valid IP address found.
 * - `req.clientIps`: A non-empty array of all valid IPs found.
 *
 * @param req - The Express request object.
 * @param res - (Optional) The Express response object. Included to support middleware signature.
 * @param next - (Optional) The next function in the Express middleware chain.
 *
 * @returns The first detected client IP address as a string, or `undefined` if none is found.
 *
 * @throws Will throw an error if the `req` argument is not defined.
 *
 * @example
 * // Standalone usage:
 * app.get('/standalone-ip', (req, res) => {
 *   const ip = getClientIp(req);
 *   res.status(200).json({ ip });
 * });
 *
 * @example
 * // Middleware usage:
 * app.use(getClientIp);
 * app.get('/middleware-ip', (req, res) => {
 *   res.status(200).json({ ip: req.clientIp, ips: req.clientIps });
 * });
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
