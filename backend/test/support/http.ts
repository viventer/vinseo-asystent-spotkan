import type { NestNodeApplication } from '@nestjs/platform-node';

export async function readMeetingResource(
  app: NestNodeApplication,
  path: string,
  meetingId: string,
  userId?: string,
): Promise<Response> {
  const headers = userId === undefined ? undefined : { 'X-User-Id': userId };
  const baseUrl = await app.getUrl();
  return fetch(`${baseUrl}/meetings/${meetingId}/${path}`, { headers });
}
