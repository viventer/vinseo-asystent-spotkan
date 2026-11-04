import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { DatabaseExecutor } from '../database/database.js';
import { DatabaseService } from '../database/database.service.js';
import { users } from './entities/user.table.js';

export interface UserRecord {
  id: string;
  displayName: string;
  email: string;
}

export interface UserLookup {
  findById(id: string, executor?: DatabaseExecutor): Promise<UserRecord | null>;
}

@Injectable()
export class UsersRepository implements UserLookup {
  constructor(private readonly database: DatabaseService) {}

  async findById(
    id: string,
    executor?: DatabaseExecutor,
  ): Promise<UserRecord | null> {
    const rows = await this.executor(executor)
      .select({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return rows[0] ?? null;
  }

  private executor(executor?: DatabaseExecutor): DatabaseExecutor {
    return executor ?? this.database.db;
  }
}
