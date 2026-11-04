import { z } from 'zod';

export const meetingReadRequestSchema = z.object({
  meetingId: z.uuid(),
  callerUserId: z.uuid(),
});

export type MeetingReadRequest = z.infer<typeof meetingReadRequestSchema>;
