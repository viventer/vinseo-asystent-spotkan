import { sql } from 'drizzle-orm';
import {
  check,
  date,
  foreignKey,
  integer,
  pgTable,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { meetings } from '../../meetings/entities/meeting.table.js';
import { summaries } from './summary.table.js';

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey(),
    meetingId: uuid('meeting_id')
      .notNull()
      .references(() => meetings.id, { onDelete: 'restrict' }),
    summaryId: uuid('summary_id'),
    position: integer('position').notNull(),
    speakerId: text('speaker_id').notNull(),
    action: text('action').notNull(),
    deadline: date('deadline').notNull(),
  },
  (table) => [
    unique('tasks_meeting_id_position_unique').on(
      table.meetingId,
      table.position,
    ),
    foreignKey({
      name: 'tasks_summary_id_meeting_id_summaries_id_meeting_id_fk',
      columns: [table.summaryId, table.meetingId],
      foreignColumns: [summaries.id, summaries.meetingId],
    }).onDelete('restrict'),
    check('tasks_position_non_negative', sql`${table.position} >= 0`),
    check(
      'tasks_speaker_id_non_empty',
      sql`char_length(${table.speakerId}) > 0`,
    ),
    check('tasks_action_non_empty', sql`char_length(${table.action}) > 0`),
  ],
);
