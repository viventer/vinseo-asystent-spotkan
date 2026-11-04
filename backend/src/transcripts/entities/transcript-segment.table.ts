import { sql } from 'drizzle-orm';
import {
  check,
  integer,
  pgTable,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { meetings } from '../../meetings/entities/meeting.table.js';

export const transcriptSegments = pgTable(
  'transcript_segments',
  {
    id: uuid('id').primaryKey(),
    meetingId: uuid('meeting_id')
      .notNull()
      .references(() => meetings.id, { onDelete: 'restrict' }),
    position: integer('position').notNull(),
    speakerId: text('speaker_id').notNull(),
    startMs: integer('start_ms').notNull(),
    endMs: integer('end_ms').notNull(),
    text: text('text').notNull(),
  },
  (table) => [
    unique('transcript_segments_meeting_id_position_unique').on(
      table.meetingId,
      table.position,
    ),
    check(
      'transcript_segments_position_non_negative',
      sql`${table.position} >= 0`,
    ),
    check(
      'transcript_segments_speaker_id_non_empty',
      sql`char_length(${table.speakerId}) > 0`,
    ),
    check(
      'transcript_segments_start_ms_non_negative',
      sql`${table.startMs} >= 0`,
    ),
    check(
      'transcript_segments_end_ms_gte_start_ms',
      sql`${table.endMs} >= ${table.startMs}`,
    ),
  ],
);
