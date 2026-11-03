import "reflect-metadata";
import { once } from "node:events";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

const app = await NestFactory.create(AppModule);
const port = 8000;
await app.listen(port);
console.log(`NestJS → http://localhost:${port}`);

await Promise.race([once(process, "SIGTERM"), once(process, "SIGINT")]);
console.log("\nShutting down...");
await app.close();
