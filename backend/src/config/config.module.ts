import { Module } from '@nestjs/common';
import { loadEnv, type Env } from './env.schema.js';

export type { Env };

export const ENV = Symbol('ENV');

@Module({
  providers: [
    {
      provide: ENV,
      useFactory: (): Env => loadEnv(process.env),
    },
  ],
  exports: [ENV],
})
export class ConfigModule {}
