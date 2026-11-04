import { meetingParticipants } from '../meetings/entities/meeting-participant.table.js';
import { meetings } from '../meetings/entities/meeting.table.js';
import { users } from '../users/entities/user.table.js';
import type { Database } from './database.js';
import {
  localSeed,
  localSeedParticipants,
  localSeedUsers,
} from './local-seed.js';
import { runInTransaction } from './run-in-transaction.js';

export async function seedLocalDatabase(db: Database): Promise<void> {
  await runInTransaction(db, async (tx) => {
    await tx
      .insert(users)
      .values([...localSeedUsers()])
      .onConflictDoNothing({ target: users.id });

    await tx
      .insert(meetings)
      .values({
        id: localSeed.meetingId,
        organizerUserId: localSeed.organizer.id,
      })
      .onConflictDoNothing({ target: meetings.id });

    await tx
      .insert(meetingParticipants)
      .values([...localSeedParticipants()])
      .onConflictDoNothing({
        target: [meetingParticipants.meetingId, meetingParticipants.userId],
      });
  });
}
