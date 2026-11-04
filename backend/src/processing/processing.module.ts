import { Module } from '@nestjs/common';
import { MeetingsModule } from '../meetings/meetings.module.js';
import { QueueModule } from '../queue/queue.module.js';
import { RecordingsModule } from '../recordings/recordings.module.js';
import { SummariesModule } from '../summaries/summaries.module.js';
import { TranscriptsModule } from '../transcripts/transcripts.module.js';
import { ProcessingController } from './processing.controller.js';
import { ProcessingService } from './processing.service.js';

@Module({
  imports: [
    QueueModule,
    MeetingsModule,
    RecordingsModule,
    TranscriptsModule,
    SummariesModule,
  ],
  controllers: [ProcessingController],
  providers: [ProcessingService],
  exports: [ProcessingService],
})
export class ProcessingModule {}
