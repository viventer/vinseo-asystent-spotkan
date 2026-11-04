import { join } from 'node:path';
import type {
  DynamicModule,
  ForwardReference,
  InjectionToken,
  Type,
} from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { NodeAdapter, type NestNodeApplication } from '@nestjs/platform-node';
import { Test, type TestingModule } from '@nestjs/testing';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { DatabaseService } from '../../src/database/database.service.js';
import { seedLocalDatabase } from '../../src/database/seed.js';
import { ApplicationExceptionFilter } from '../../src/shared/filters/application-exception.filter.js';

process.env.PORT ??= '3000';
process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5432/vinseo_test';
process.env.REDIS_URL ??= 'redis://localhost:6379';

type NestImport =
  Type | DynamicModule | Promise<DynamicModule> | ForwardReference;

export interface ProviderOverride {
  provide: InjectionToken;
  useValue: unknown;
}

export interface TestApp {
  app: NestNodeApplication;
  database: DatabaseService;
  moduleRef: TestingModule;
}

export async function createTestApp(options: {
  imports: NestImport[];
  overrides?: readonly ProviderOverride[];
}): Promise<TestApp> {
  const builder = Test.createTestingModule({
    imports: options.imports,
    providers: [
      { provide: APP_PIPE, useClass: ZodValidationPipe },
      { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    ],
  });
  for (const override of options.overrides ?? []) {
    builder.overrideProvider(override.provide).useValue(override.useValue);
  }

  const moduleRef = await builder.compile();
  const database = moduleRef.get(DatabaseService);
  await migrate(database.db, {
    migrationsFolder: join(import.meta.dirname, '../../drizzle'),
  });
  await seedLocalDatabase(database.db);

  const app: NestNodeApplication = moduleRef.createNestApplication(
    new NodeAdapter(),
  );
  app.useGlobalFilters(new ApplicationExceptionFilter());
  await app.listen(0);

  return { app, database, moduleRef };
}
