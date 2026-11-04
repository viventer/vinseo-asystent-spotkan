import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module.js';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  await app.close();
}

await bootstrap();
