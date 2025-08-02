import express, { type Router } from 'express';

export const routesRouter: Router = express.Router();

routesRouter.get('/', (_req, res) => {
  res.status(200).json({ message: 'Hello World' });
});

routesRouter.get('/health', (_req, res) => {
  res.status(200).send('OK');
});
