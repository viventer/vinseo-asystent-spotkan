import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { MeetingsModule } from '../meetings/meetings.module.js';
import { TranscriptsModule } from '../transcripts/transcripts.module.js';
import { FakeSummaryAdapter } from './adapters/fake-summary.adapter.js';
import { SUMMARY_ADAPTER } from './adapters/summary.adapter.js';
import { SummariesController } from './summaries.controller.js';
import { SummariesRepository } from './summaries.repository.js';
import { SummariesService } from './summaries.service.js';

@Module({
  imports: [DatabaseModule, MeetingsModule, TranscriptsModule],
  controllers: [SummariesController],
  providers: [
    SummariesRepository,
    SummariesService,
    {
      provide: SUMMARY_ADAPTER,
      useClass: FakeSummaryAdapter,
    },
  ],
  exports: [SummariesService],
})
export class SummariesModule {}
