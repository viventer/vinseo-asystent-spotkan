import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { DatabaseExecutor } from '../database/database.js';
import { DatabaseService } from '../database/database.service.js';
import { meetingParticipants } from './entities/meeting-participant.table.js';

export type ParticipantRole = 'employee' | 'client';

export interface ParticipantLookup {
  findParticipantRole(
    meetingId: string,
    userId: string,
    executor?: DatabaseExecutor,
  ): Promise<ParticipantRole | null>;
}

@Injectable()
export class MeetingsRepository implements ParticipantLookup {
  constructor(private readonly database: DatabaseService) {}

  async findParticipantRole(
    meetingId: string,
    userId: string,
    executor?: DatabaseExecutor,
  ): Promise<ParticipantRole | null> {
    const rows = await this.executor(executor)
      .select({ role: meetingParticipants.role })
      .from(meetingParticipants)
      .where(
        and(
          eq(meetingParticipants.meetingId, meetingId),
          eq(meetingParticipants.userId, userId),
        ),
      )
      .limit(1);

    return rows[0]?.role ?? null;
  }

  private executor(executor?: DatabaseExecutor): DatabaseExecutor {
    return executor ?? this.database.db;
  }
}
