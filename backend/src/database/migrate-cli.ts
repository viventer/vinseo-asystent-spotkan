import { join } from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { loadEnv } from '../config/env.schema.js';
import { createDatabase } from './database.js';

const env = loadEnv(process.env);
const database = createDatabase(env.DATABASE_URL);

try {
  await migrate(database.db, {
    migrationsFolder: join(import.meta.dirname, '../../drizzle'),
  });
  console.log('Applied database migrations');
} finally {
  await database.close();
}
