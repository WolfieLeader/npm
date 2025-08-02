import { ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import morgan from 'morgan';
import { AppModule } from './app.module';
import { env } from './env';
import { ErrorCatcher } from './error/error-catcher.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [env.SERVER_URL],
    methods: 'GET,POST,PUT,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'"],
          fontSrc: ["'self'"],
          mediaSrc: ["'self'"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          frameSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: {
        maxAge: 2 * 365 * 24 * 60 * 60,
        includeSubDomains: true,
        preload: true,
      },
      noSniff: true,
      referrerPolicy: { policy: 'no-referrer' },
      xPermittedCrossDomainPolicies: {
        permittedPolicies: 'none',
      },
    }),
  );

  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.setGlobalPrefix(new URL(env.SERVER_URL).pathname);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new ErrorCatcher(httpAdapter));

  await app.listen(env.SERVER_PORT);

  console.log(
    '============= 🪺  NestJS Server 🪺  =============\n',
    `🚀 Server runs on: ${env.SERVER_URL}\n`,
    '==============================================',
  );
}

bootstrap();
