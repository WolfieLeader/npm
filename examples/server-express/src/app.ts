import type { Application, NextFunction, Request, Response } from 'express';
import express from 'express';
import morgan from 'morgan';
import { HttpException } from './error/HttpException';
import { router } from './routes';

export default function createApp(): Application {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(morgan('dev'));

  app.use(router);

  app.use((_req: Request, _res: Response, _next: NextFunction) => {
    throw new HttpException('Not Found', 404);
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const { message, statusCode, description } = new HttpException(err);
    res.status(statusCode).json({ error: message, statusCode, description });
  });

  return app;
}
