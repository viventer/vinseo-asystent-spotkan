import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { speakerSchema } from '../../shared/dto/speaker.dto.js';

export const decisionResponseSchema = z.object({
  text: z.string().min(1),
  speakers: z.array(speakerSchema),
});

export const summaryResponseSchema = z.object({
  summary: z.string().min(1),
  decisions: z.array(decisionResponseSchema),
});

export type SummaryResponse = z.infer<typeof summaryResponseSchema>;

export class SummaryResponseDto extends createZodDto(summaryResponseSchema) {}
