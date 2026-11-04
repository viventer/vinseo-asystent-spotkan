import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { ProcessingModule } from './processing/processing.module.js';
import { ProcessingProcessor } from './processing/processing.processor.js';
import { QueueModule } from './queue/queue.module.js';

@Module({
  imports: [ConfigModule, DatabaseModule, QueueModule, ProcessingModule],
  providers: [ProcessingProcessor],
})
export class WorkerModule {}
