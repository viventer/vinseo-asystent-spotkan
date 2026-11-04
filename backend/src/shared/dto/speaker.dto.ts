import { z } from 'zod';

export const speakerSchema = z.object({
  speakerId: z.string().min(1),
  displayName: z.null(),
});

export type Speaker = z.infer<typeof speakerSchema>;
