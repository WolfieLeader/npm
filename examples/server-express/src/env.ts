/** biome-ignore-all lint/style/noProcessEnv: env.ts file */
import dotenv from "dotenv";
import { z } from "zod/v4";

dotenv.config({ path: "../../.env" });
if (!process.env.NODE_ENV) dotenv.config();

const zStr = z.string().trim().min(1);

export const zEnv = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  HTTPS: z.stringbool().default(false),
  EXPRESS_PORT: zStr.regex(/^\d+$/).transform(Number).default(3001),
  NESTJS_PORT: zStr.regex(/^\d+$/).transform(Number).default(3002),
});

const { data: parsedEnv, error: envError } = zEnv.safeParse(process.env);

if (envError) {
  console.error("❌ Express App environment variables are invalid. Errors:", z.prettifyError(envError));
  process.exit(1);
}

export const env = {
  ...parsedEnv,
  SERVER_PORT: parsedEnv.EXPRESS_PORT,
};
