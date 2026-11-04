import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ENV, type Env } from '../config/config.module.js';
import { EnqueueService } from './enqueue.service.js';
import { MEETING_PROCESSING_QUEUE_NAME } from './queue-names.js';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ENV],
      useFactory: (env: Env) => ({
        connection: {
          url: env.REDIS_URL,
          maxRetriesPerRequest: null,
        },
      }),
    }),
    BullModule.registerQueue({
      name: MEETING_PROCESSING_QUEUE_NAME,
    }),
  ],
  providers: [EnqueueService],
  exports: [EnqueueService],
})
export class QueueModule {}
