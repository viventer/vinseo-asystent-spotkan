import { loadEnv } from '../config/env.schema.js';
import { createDatabase } from './database.js';
import { localSeed } from './local-seed.js';
import { seedLocalDatabase } from './seed.js';

const env = loadEnv(process.env);
const database = createDatabase(env.DATABASE_URL);

try {
  await seedLocalDatabase(database.db);
  console.log(`Applied local seed for meeting ${localSeed.meetingId}`);
} finally {
  await database.close();
}
