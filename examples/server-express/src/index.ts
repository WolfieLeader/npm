import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateCerts } from 'generate-certs';
import createApp from './app';
import { env } from './env';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const certs = generateCerts({ certsPath: path.resolve(__dirname, '../certs') });

function bootstrap() {
  const app = createApp();
  const server = env.HTTPS ? https.createServer(certs, app) : http.createServer(app);
  const serverUrl = `${env.HTTPS ? 'https' : 'http'}://localhost:${env.SERVER_PORT}`;
  server.listen(env.SERVER_PORT, '0.0.0.0', () => {
    console.log(
      ' ============= 📫  Express Server 📫  ==========\n',
      `🚀 Server runs on: ${serverUrl}\n`,
      '==============================================',
    );
  });
}

bootstrap();
