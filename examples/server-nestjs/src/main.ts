import path from "node:path";
import { HttpAdapterHost, NestFactory } from "@nestjs/core";
import { generateCerts } from "generate-certs";
import morgan from "morgan";
import { AppModule } from "./app.module";
import { env } from "./env";
import { ErrorCatcher } from "./error/error-catcher.filter";

const certs = generateCerts({ certsPath: path.resolve(__dirname, "../certs") });

async function bootstrap() {
  const app = await NestFactory.create(AppModule, env.HTTPS ? { httpsOptions: certs } : undefined);

  app.use(morgan("dev"));

  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new ErrorCatcher(httpAdapter));

  await app.listen(env.SERVER_PORT);
  const serverUrl = `${env.HTTPS ? "https" : "http"}://localhost:${env.SERVER_PORT}`;
  console.log(
    "============= 🪺  NestJS Server 🪺  =============\n",
    `🚀 Server runs on: ${serverUrl}\n`,
    "==============================================",
  );
}

bootstrap();
