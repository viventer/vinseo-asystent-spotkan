import { Injectable } from '@nestjs/common';
import { readExampleMeetingFixture } from '../../shared/fixtures/example-meeting-fixture.js';
import {
  transcriptionResultSchema,
  type TranscriptionAdapter,
  type TranscriptionRequest,
  type TranscriptionResult,
} from './transcription.adapter.js';

@Injectable()
export class FakeTranscriptionAdapter implements TranscriptionAdapter {
  transcribe(_request: TranscriptionRequest): Promise<TranscriptionResult> {
    return Promise.resolve(
      transcriptionResultSchema.parse(readExampleMeetingFixture().transcript),
    );
  }
}
