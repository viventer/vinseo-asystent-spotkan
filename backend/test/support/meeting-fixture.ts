import { eq } from 'drizzle-orm';
import type { DatabaseService } from '../../src/database/database.service.js';
import { localSeed } from '../../src/database/local-seed.js';
import { meetingParticipants } from '../../src/meetings/entities/meeting-participant.table.js';
import { meetings } from '../../src/meetings/entities/meeting.table.js';
import { decisions } from '../../src/summaries/entities/decision.table.js';
import { summaries } from '../../src/summaries/entities/summary.table.js';
import { tasks } from '../../src/summaries/entities/task.table.js';
import { transcriptSegments } from '../../src/transcripts/entities/transcript-segment.table.js';
import type { TranscriptsService } from '../../src/transcripts/transcripts.service.js';

export const fixtureMeetingId = '12121212-1212-4212-8212-121212121212';
export const missingMeetingId = '77777777-7777-4777-8777-777777777777';
export const unknownUserId = '99999999-9999-4999-8999-999999999999';

export async function seedFixtureMeeting(
  database: DatabaseService,
): Promise<void> {
  await database.db
    .insert(meetings)
    .values({
      id: fixtureMeetingId,
      organizerUserId: localSeed.organizer.id,
    })
    .onConflictDoNothing({ target: meetings.id });
  await database.db
    .insert(meetingParticipants)
    .values([
      {
        meetingId: fixtureMeetingId,
        userId: localSeed.employees[0].id,
        role: 'employee',
      },
      {
        meetingId: fixtureMeetingId,
        userId: localSeed.employees[1].id,
        role: 'employee',
      },
      {
        meetingId: fixtureMeetingId,
        userId: localSeed.client.id,
        role: 'client',
      },
    ])
    .onConflictDoNothing({
      target: [meetingParticipants.meetingId, meetingParticipants.userId],
    });
}

export async function clearFixtureMeeting(
  database: DatabaseService,
): Promise<void> {
  await database.db.delete(tasks).where(eq(tasks.meetingId, fixtureMeetingId));
  await database.db
    .delete(decisions)
    .where(eq(decisions.meetingId, fixtureMeetingId));
  await database.db
    .delete(summaries)
    .where(eq(summaries.meetingId, fixtureMeetingId));
  await database.db
    .delete(transcriptSegments)
    .where(eq(transcriptSegments.meetingId, fixtureMeetingId));
}

export async function removeFixtureMeeting(
  database: DatabaseService,
): Promise<void> {
  await clearFixtureMeeting(database);
  await database.db
    .delete(meetingParticipants)
    .where(eq(meetingParticipants.meetingId, fixtureMeetingId));
  await database.db.delete(meetings).where(eq(meetings.id, fixtureMeetingId));
}

export function storeFixtureTranscript(
  transcripts: TranscriptsService,
): ReturnType<TranscriptsService['ensureTranscriptStored']> {
  return transcripts.ensureTranscriptStored({
    meetingId: fixtureMeetingId,
    recordingExternalId: `fake-recording:${fixtureMeetingId}`,
  });
}
