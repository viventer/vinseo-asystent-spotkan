import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { QueueModule } from './queue/queue.module.js';

@Module({
  imports: [ConfigModule, DatabaseModule, QueueModule, HealthModule],
})
export class AppModule {}
