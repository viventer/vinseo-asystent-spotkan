import { type ExtractTablesWithRelations } from 'drizzle-orm';
import {
  drizzle,
  type NodePgDatabase,
  type NodePgQueryResultHKT,
} from 'drizzle-orm/node-postgres';
import { type PgTransaction } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';

export type Database = NodePgDatabase;

export type DatabaseTransaction = PgTransaction<
  NodePgQueryResultHKT,
  Record<string, never>,
  ExtractTablesWithRelations<Record<string, never>>
>;

export type DatabaseExecutor = Database | DatabaseTransaction;

export function createDatabase(connectionString: string): {
  db: Database;
  close: () => Promise<void>;
} {
  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 5_000,
  });
  pool.on('error', (error: Error) => {
    console.error(`PostgreSQL pool error: ${error.message}`);
  });

  return {
    db: drizzle(pool),
    close: async () => {
      await pool.end();
    },
  };
}
