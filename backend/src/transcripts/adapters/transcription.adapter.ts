import { z } from 'zod';

export const TRANSCRIPTION_ADAPTER = Symbol('TRANSCRIPTION_ADAPTER');

export const transcriptionSegmentSchema = z
  .strictObject({
    speakerId: z.string().trim().min(1),
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().nonnegative(),
    text: z.string().trim().min(1),
  })
  .refine((segment) => segment.endMs >= segment.startMs, {
    message: 'endMs must be greater than or equal to startMs',
  });

export const transcriptionResultSchema = z.strictObject({
  segments: z.array(transcriptionSegmentSchema).min(1),
});

export type TranscriptionSegment = z.infer<typeof transcriptionSegmentSchema>;
export type TranscriptionResult = z.infer<typeof transcriptionResultSchema>;

export interface TranscriptionRequest {
  meetingId: string;
  recordingExternalId: string;
}

export interface TranscriptionAdapter {
  transcribe(request: TranscriptionRequest): Promise<unknown>;
}
