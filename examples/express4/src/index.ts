import https from "node:https";
import path from "node:path";
import { generateCerts } from "generate-certs";
import { createApp } from "./app.js";

const app = createApp();

const HTTP_PORT = 8000;
const HTTPS_PORT = 8443;

const server = app.listen(HTTP_PORT, () => {
  console.log(`HTTP  → http://localhost:${HTTP_PORT}`);
});

const certs = generateCerts({
  certsPath: path.resolve(import.meta.dirname, "..", "certs"),
});

const httpsServer = https.createServer(certs, app).listen(HTTPS_PORT, () => {
  console.log(`HTTPS → https://localhost:${HTTPS_PORT}`);
});

function shutdown() {
  console.log("\nShutting down...");
  server.close(() => {
    httpsServer.close(() => {
      process.exit(0);
    });
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
