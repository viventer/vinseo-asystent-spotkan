import { NestFactory } from '@nestjs/core';
import { useWorkerProcess } from './config/process-role.js';
import { WorkerModule } from './worker.module.js';

async function bootstrap() {
  useWorkerProcess();
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
}

await bootstrap();
