import { Injectable } from '@nestjs/common';
import type {
  RecordingReady,
  RecordingSourceAdapter,
} from './recording-source.adapter.js';

@Injectable()
export class FakeRecordingSourceAdapter implements RecordingSourceAdapter {
  getReadyRecording(meetingId: string): Promise<RecordingReady> {
    return Promise.resolve({
      externalId: `fake-recording:${meetingId}`,
      ready: true,
    });
  }
}
