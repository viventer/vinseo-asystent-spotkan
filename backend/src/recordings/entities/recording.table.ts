import { pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { meetings } from '../../meetings/entities/meeting.table.js';

export const recordings = pgTable('recordings', {
  id: uuid('id').primaryKey(),
  meetingId: uuid('meeting_id')
    .notNull()
    .unique()
    .references(() => meetings.id, { onDelete: 'restrict' }),
  externalId: text('external_id').notNull().unique(),
});
