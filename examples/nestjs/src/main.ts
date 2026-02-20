import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = 8000;
  await app.listen(port);
  console.log(`NestJS → http://localhost:${port}`);

  function shutdown() {
    console.log("\nShutting down...");
    app.close().then(() => process.exit(0));
  }

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

bootstrap();
