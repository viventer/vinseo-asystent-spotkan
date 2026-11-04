import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { ConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { MeetingsModule } from './meetings/meetings.module.js';
import { ProcessingModule } from './processing/processing.module.js';
import { QueueModule } from './queue/queue.module.js';
import { SummariesModule } from './summaries/summaries.module.js';
import { TranscriptsModule } from './transcripts/transcripts.module.js';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    QueueModule,
    HealthModule,
    MeetingsModule,
    TranscriptsModule,
    SummariesModule,
    ProcessingModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
  ],
})
export class AppModule {}
