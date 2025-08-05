import { Module } from '@nestjs/common';
import { EnvModule } from './modules/env.module';
import { RoutesModule } from './modules/routes/routes.module';

@Module({ imports: [EnvModule, RoutesModule] })
export class AppModule {}
