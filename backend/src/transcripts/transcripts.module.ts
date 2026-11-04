import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { MeetingsModule } from '../meetings/meetings.module.js';
import { FakeTranscriptionAdapter } from './adapters/fake-transcription.adapter.js';
import { TRANSCRIPTION_ADAPTER } from './adapters/transcription.adapter.js';
import { TranscriptsController } from './transcripts.controller.js';
import { TranscriptsRepository } from './transcripts.repository.js';
import { TranscriptsService } from './transcripts.service.js';

@Module({
  imports: [DatabaseModule, MeetingsModule],
  controllers: [TranscriptsController],
  providers: [
    TranscriptsRepository,
    TranscriptsService,
    {
      provide: TRANSCRIPTION_ADAPTER,
      useClass: FakeTranscriptionAdapter,
    },
  ],
  exports: [TranscriptsService],
})
export class TranscriptsModule {}
