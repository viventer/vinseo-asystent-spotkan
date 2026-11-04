import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { DatabaseExecutor } from '../database/database.js';
import { DatabaseService } from '../database/database.service.js';
import { recordings } from './entities/recording.table.js';

export interface RecordingRecord {
  id: string;
  meetingId: string;
  externalId: string;
}

export interface RecordingStore {
  findByMeetingId(
    meetingId: string,
    executor?: DatabaseExecutor,
  ): Promise<RecordingRecord | null>;
  insert(recording: RecordingRecord, executor: DatabaseExecutor): Promise<void>;
}

@Injectable()
export class RecordingsRepository implements RecordingStore {
  constructor(private readonly database: DatabaseService) {}

  async findByMeetingId(
    meetingId: string,
    executor?: DatabaseExecutor,
  ): Promise<RecordingRecord | null> {
    const rows = await this.executor(executor)
      .select({
        id: recordings.id,
        meetingId: recordings.meetingId,
        externalId: recordings.externalId,
      })
      .from(recordings)
      .where(eq(recordings.meetingId, meetingId))
      .limit(1);

    return rows[0] ?? null;
  }

  async insert(
    recording: RecordingRecord,
    executor: DatabaseExecutor,
  ): Promise<void> {
    await executor.insert(recordings).values({
      id: recording.id,
      meetingId: recording.meetingId,
      externalId: recording.externalId,
    });
  }

  private executor(executor?: DatabaseExecutor): DatabaseExecutor {
    return executor ?? this.database.db;
  }
}
