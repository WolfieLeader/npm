import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { EnvModule } from './modules/env.module';
import { PublicModule } from './modules/public/public.module';
import { RateLimiterModule } from './modules/rate-limiter.module';

@Module({
  imports: [EnvModule, RateLimiterModule, PublicModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
