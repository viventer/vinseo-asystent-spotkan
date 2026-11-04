import { sql } from 'drizzle-orm';
import { check, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core';
import { meetings } from '../../meetings/entities/meeting.table.js';

export const summaries = pgTable(
  'summaries',
  {
    id: uuid('id').primaryKey(),
    meetingId: uuid('meeting_id')
      .notNull()
      .unique()
      .references(() => meetings.id, { onDelete: 'restrict' }),
    text: text('text').notNull(),
  },
  (table) => [
    unique('summaries_id_meeting_id_unique').on(table.id, table.meetingId),
    check('summaries_text_non_empty', sql`char_length(${table.text}) > 0`),
  ],
);
