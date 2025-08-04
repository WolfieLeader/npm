import type { Application, NextFunction, Request, Response } from 'express';
import express from 'express';
import { getClientIp } from 'get-client-ip';
import { deleteCookie, getCookie, setCookie } from 'modern-cookies';
import morgan from 'morgan';
import { HttpException } from './error/HttpException';

export default function createApp(): Application {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(morgan('dev'));

  app.get('/', (_req, res) => {
    res.status(200).json({ message: 'Hello World' });
  });

  app.get('/health', (_req, res) => {
    res.status(200).send('OK');
  });

  app.get('/standalone-ip', (req, res) => {
    const ip = getClientIp(req);
    res.status(200).json({ ip });
  });

  app.get('/middleware-ip', getClientIp, (req, res) => {
    res.status(200).json({ ip: req.clientIp, ips: req.clientIps });
  });

  app.get('/cookie', (req, res) => {
    const cookie1 = getCookie(req, 'cookie1');
    const cookie2 = getCookie(req, 'cookie2');
    const cookie3 = getCookie(req, 'cookie3');
    res.status(200).json({ cookie1, cookie2, cookie3 });
  });

  app.get('/set-cookie', (_req, res) => {
    setCookie(res, 'cookie1', 'SomeValue123', { httpOnly: true, maxAge: 60 });
    res.status(200).json({ message: 'Cookie set' });
  });

  app.get('/set-cookies', (_req, res) => {
    setCookie(res, 'cookie2', 'anotherValue', { httpOnly: true, maxAge: 60 });
    setCookie(res, 'cookie3', 'yetAnotherValue', { httpOnly: true, maxAge: 60 });
    res.status(200).json({ message: 'Another cookie set' });
  });

  app.get('/delete-cookie', (_req, res) => {
    deleteCookie(res, 'cookie1', { httpOnly: true });
    deleteCookie(res, 'cookie2', { httpOnly: true });
    res.status(200).json({ message: 'Cookie cleared' });
  });

  app.use((_req: Request, _res: Response, _next: NextFunction) => {
    throw new HttpException('Not Found', 404);
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const { message, statusCode, description } = new HttpException(err);
    res.status(statusCode).json({ error: message, statusCode, description });
  });

  return app;
}
