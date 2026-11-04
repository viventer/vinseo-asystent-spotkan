import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { FakeRecordingSourceAdapter } from './adapters/fake-recording-source.adapter.js';
import { RECORDING_SOURCE_ADAPTER } from './adapters/recording-source.adapter.js';
import { RecordingsRepository } from './recordings.repository.js';
import { RecordingsService } from './recordings.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [
    RecordingsRepository,
    RecordingsService,
    {
      provide: RECORDING_SOURCE_ADAPTER,
      useClass: FakeRecordingSourceAdapter,
    },
  ],
  exports: [RecordingsService],
})
export class RecordingsModule {}
