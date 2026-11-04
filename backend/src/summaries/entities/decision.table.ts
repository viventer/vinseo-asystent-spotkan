import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  integer,
  pgTable,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { meetings } from '../../meetings/entities/meeting.table.js';
import { summaries } from './summary.table.js';

export const decisions = pgTable(
  'decisions',
  {
    id: uuid('id').primaryKey(),
    meetingId: uuid('meeting_id')
      .notNull()
      .references(() => meetings.id, { onDelete: 'restrict' }),
    summaryId: uuid('summary_id'),
    position: integer('position').notNull(),
    text: text('text').notNull(),
    speakerIds: text('speaker_ids').array().notNull(),
  },
  (table) => [
    unique('decisions_meeting_id_position_unique').on(
      table.meetingId,
      table.position,
    ),
    foreignKey({
      name: 'decisions_summary_id_meeting_id_summaries_id_meeting_id_fk',
      columns: [table.summaryId, table.meetingId],
      foreignColumns: [summaries.id, summaries.meetingId],
    }).onDelete('restrict'),
    check('decisions_position_non_negative', sql`${table.position} >= 0`),
    check('decisions_text_non_empty', sql`char_length(${table.text}) > 0`),
    check(
      'decisions_speaker_ids_elements_non_empty',
      sql`array_position(${table.speakerIds}, '') IS NULL AND array_position(${table.speakerIds}, NULL) IS NULL`,
    ),
  ],
);
