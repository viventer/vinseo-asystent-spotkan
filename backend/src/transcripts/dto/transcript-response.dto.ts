import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { speakerSchema } from '../../shared/dto/speaker.dto.js';

export const transcriptSegmentResponseSchema = z
  .object({
    speaker: speakerSchema,
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().nonnegative(),
    text: z.string().min(1),
  })
  .refine((segment) => segment.endMs >= segment.startMs, {
    message: 'endMs must be greater than or equal to startMs',
  });

export const transcriptResponseSchema = z.object({
  segments: z.array(transcriptSegmentResponseSchema).min(1),
});

export type TranscriptResponse = z.infer<typeof transcriptResponseSchema>;

export class TranscriptResponseDto extends createZodDto(
  transcriptResponseSchema,
) {}
