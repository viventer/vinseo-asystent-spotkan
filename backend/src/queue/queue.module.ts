import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ENV, type Env } from '../config/config.module.js';
import { EnqueueService } from './enqueue.service.js';
import { meetingProcessingJobOptions } from './job-options.js';
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
        ...(env.QUEUE_PREFIX ? { prefix: env.QUEUE_PREFIX } : {}),
      }),
    }),
    BullModule.registerQueueAsync({
      name: MEETING_PROCESSING_QUEUE_NAME,
      imports: [ConfigModule],
      inject: [ENV],
      useFactory: (env: Env) => ({
        defaultJobOptions: meetingProcessingJobOptions(env),
      }),
    }),
  ],
  providers: [EnqueueService],
  exports: [EnqueueService],
})
export class QueueModule {}
