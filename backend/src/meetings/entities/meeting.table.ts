import { pgTable, uuid } from 'drizzle-orm/pg-core';
import { users } from '../../users/entities/user.table.js';

export const meetings = pgTable('meetings', {
  id: uuid('id').primaryKey(),
  organizerUserId: uuid('organizer_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
});
