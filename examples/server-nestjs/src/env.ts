/** biome-ignore-all lint/style/noProcessEnv: env.ts file */
import dotenv from 'dotenv';
import { z } from 'zod/v4';

dotenv.config({ path: '../../.env' });
if (!process.env.NODE_ENV) dotenv.config();

const zStr = z.string().trim().min(1);

export const zEnv = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  EXPRESS_URL: z.url().default('https://localhost:3001'),
  EXPRESS_PORT: zStr.regex(/^\d+$/).transform(Number).default(3001),
  NESTJS_URL: z.url().default('https://localhost:3002'),
  NESTJS_PORT: zStr.regex(/^\d+$/).transform(Number).default(3002),
});

const { data: parsedEnv, error: envError } = zEnv.safeParse(process.env);

if (envError) {
  console.error('❌ NestJS App environment variables are invalid. Errors:', z.prettifyError(envError));
  process.exit(1);
}

export const env = {
  ...parsedEnv,
  SERVER_URL: parsedEnv.NESTJS_URL,
  SERVER_PORT: parsedEnv.NESTJS_PORT,
};
