import { NestFactory } from '@nestjs/core';
import { NestNodeApplication, NodeAdapter } from '@nestjs/platform-node';
import { AppModule } from './app.module.js';
import { ENV, type Env } from './config/config.module.js';
import { ApplicationExceptionFilter } from './shared/filters/application-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create<NestNodeApplication>(
    AppModule,
    new NodeAdapter(),
  );
  app.useGlobalFilters(new ApplicationExceptionFilter());
  const env = app.get<Env>(ENV);
  await app.listen(env.PORT);
}

await bootstrap();
