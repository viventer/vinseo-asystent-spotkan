import { pgEnum, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { users } from '../../users/entities/user.table.js';
import { meetings } from './meeting.table.js';

export const participantRole = pgEnum('participant_role', [
  'employee',
  'client',
]);

export const meetingParticipants = pgTable(
  'meeting_participants',
  {
    meetingId: uuid('meeting_id')
      .notNull()
      .references(() => meetings.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    role: participantRole('role').notNull(),
  },
  (table) => [primaryKey({ columns: [table.meetingId, table.userId] })],
);
