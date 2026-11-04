import { Module } from '@nestjs/common';
import { loadEnv, loadWorkerEnv, type Env } from './env.schema.js';
import { currentProcessRole } from './process-role.js';

export type { Env };

export const ENV = Symbol('ENV');

@Module({
  providers: [
    {
      provide: ENV,
      useFactory: (): Env =>
        currentProcessRole() === 'worker'
          ? loadWorkerEnv(process.env)
          : loadEnv(process.env),
    },
  ],
  exports: [ENV],
})
export class ConfigModule {}
