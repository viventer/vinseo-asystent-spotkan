import { z } from 'zod';
import { ApplicationError } from '../shared/errors/application-error.js';

export const localSpeakerIdSchema = z
  .string()
  .trim()
  .regex(/^speaker_[1-9]\d*$/);

const summaryPayloadSegmentSchema = z
  .strictObject({
    speakerId: localSpeakerIdSchema,
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().nonnegative(),
    text: z.string().trim().min(1),
  })
  .refine((segment) => segment.endMs >= segment.startMs, {
    message: 'endMs must be greater than or equal to startMs',
  });

const summaryPayloadSpeakerSchema = z.strictObject({
  speakerId: localSpeakerIdSchema,
  role: z.literal('unknown'),
});

export const summaryPayloadSchema = z
  .strictObject({
    segments: z.array(summaryPayloadSegmentSchema).min(1),
    speakers: z.array(summaryPayloadSpeakerSchema).min(1),
  })
  .refine(
    (payload) => {
      const listed = payload.speakers.map((speaker) => speaker.speakerId);
      const listedSet = new Set(listed);
      const used = new Set(
        payload.segments.map((segment) => segment.speakerId),
      );
      if (listedSet.size !== listed.length || listedSet.size !== used.size) {
        return false;
      }
      for (const speakerId of used) {
        if (!listedSet.has(speakerId)) {
          return false;
        }
      }
      return true;
    },
    { message: 'speakers must be the segment speaker ids' },
  );

export type SummaryPayload = z.infer<typeof summaryPayloadSchema>;

export interface SummaryPayloadSegmentInput {
  speakerId: string;
  startMs: number;
  endMs: number;
  text: string;
}

export function buildSummaryPayload(
  segments: readonly SummaryPayloadSegmentInput[],
): SummaryPayload {
  const speakerIds: string[] = [];
  for (const segment of segments) {
    if (!speakerIds.includes(segment.speakerId)) {
      speakerIds.push(segment.speakerId);
    }
  }

  const parsed = summaryPayloadSchema.safeParse({
    segments: segments.map((segment) => ({
      speakerId: segment.speakerId,
      startMs: segment.startMs,
      endMs: segment.endMs,
      text: segment.text,
    })),
    speakers: speakerIds.map((speakerId) => ({
      speakerId,
      role: 'unknown',
    })),
  });
  if (!parsed.success) {
    throw new ApplicationError('internal_error');
  }
  return parsed.data;
}
