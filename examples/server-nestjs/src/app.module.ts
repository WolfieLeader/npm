import { Module } from '@nestjs/common';
import { EnvModule } from './modules/env.module';
import { PublicModule } from './modules/public/public.module';

@Module({ imports: [EnvModule, PublicModule] })
export class AppModule {}
