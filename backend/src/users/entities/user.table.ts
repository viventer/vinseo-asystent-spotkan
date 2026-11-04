import { pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  displayName: text('display_name').notNull(),
  email: text('email').notNull().unique(),
});
