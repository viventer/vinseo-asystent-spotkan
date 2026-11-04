import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ENV, type Env } from '../config/config.module.js';
import {
  createDatabase,
  type Database,
  type DatabaseTransaction,
} from './database.js';
import { runInTransaction } from './run-in-transaction.js';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly close: () => Promise<void>;
  readonly db: Database;

  constructor(@Inject(ENV) env: Env) {
    const created = createDatabase(env.DATABASE_URL);
    this.db = created.db;
    this.close = created.close;
  }

  transaction<T>(work: (tx: DatabaseTransaction) => Promise<T>): Promise<T> {
    return runInTransaction(this.db, work);
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }
}
