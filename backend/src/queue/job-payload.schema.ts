import { z } from 'zod';

export const processingStepSchema = z.enum([
  'recording-ready',
  'transcribe',
  'summarize-and-publish',
]);

export const jobPayloadSchema = z.strictObject({
  meetingId: z.uuid(),
  step: processingStepSchema,
});

export type ProcessingStep = z.infer<typeof processingStepSchema>;
export type JobPayload = z.infer<typeof jobPayloadSchema>;
