import type { Database, DatabaseTransaction } from './database.js';

export async function runInTransaction<T>(
  db: Database,
  work: (tx: DatabaseTransaction) => Promise<T>,
): Promise<T> {
  return db.transaction(work);
}
