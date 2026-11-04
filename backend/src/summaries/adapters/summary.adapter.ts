import { z } from 'zod';
import { localSpeakerIdSchema } from '../summary-payload.js';

export const SUMMARY_ADAPTER = Symbol('SUMMARY_ADAPTER');

export const summaryDecisionSchema = z.strictObject({
  text: z.string().trim().min(1),
  speakerIds: z.array(localSpeakerIdSchema),
});

export const summaryTaskSchema = z.strictObject({
  speakerId: localSpeakerIdSchema,
  action: z.string().trim().min(1),
  deadline: z.iso.date(),
});

export const summaryResultSchema = z.strictObject({
  summary: z.string().trim().min(1),
  decisions: z.array(summaryDecisionSchema),
  tasks: z.array(summaryTaskSchema),
});

export type SummaryDecision = z.infer<typeof summaryDecisionSchema>;
export type SummaryTask = z.infer<typeof summaryTaskSchema>;
export type SummaryResult = z.infer<typeof summaryResultSchema>;

export interface SummaryAdapter {
  summarize(payload: unknown): Promise<unknown>;
}
