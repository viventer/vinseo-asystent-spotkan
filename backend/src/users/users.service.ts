import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { DatabaseExecutor } from '../database/database.js';
import { ApplicationError } from '../shared/errors/application-error.js';
import {
  UsersRepository,
  type UserLookup,
  type UserRecord,
} from './users.repository.js';

export type { UserRecord };

const userIdSchema = z.uuid();

@Injectable()
export class UsersService {
  constructor(
    @Inject(UsersRepository)
    private readonly usersRepository: UserLookup,
  ) {}

  async findById(
    id: string,
    executor?: DatabaseExecutor,
  ): Promise<UserRecord | null> {
    const parsed = userIdSchema.safeParse(id);
    if (!parsed.success) {
      throw new ApplicationError('invalid_request');
    }

    return this.usersRepository.findById(parsed.data, executor);
  }
}
