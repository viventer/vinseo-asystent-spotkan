import { z } from 'zod';

export const RECORDING_SOURCE_ADAPTER = Symbol('RECORDING_SOURCE_ADAPTER');

export const recordingReadySchema = z.strictObject({
  externalId: z.string().trim().min(1),
  ready: z.literal(true),
});

export type RecordingReady = z.infer<typeof recordingReadySchema>;

export interface RecordingSourceAdapter {
  getReadyRecording(meetingId: string): Promise<unknown>;
}
