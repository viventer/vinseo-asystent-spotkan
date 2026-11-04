import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { DatabaseTransaction } from '../database/database.js';
import { DatabaseService } from '../database/database.service.js';
import { ApplicationError } from '../shared/errors/application-error.js';
import {
  FOREIGN_KEY_VIOLATION,
  postgresErrorCode,
  UNIQUE_VIOLATION,
} from '../shared/errors/postgres-error.js';
import {
  RECORDING_SOURCE_ADAPTER,
  recordingReadySchema,
  type RecordingSourceAdapter,
} from './adapters/recording-source.adapter.js';
import {
  RecordingsRepository,
  type RecordingRecord,
  type RecordingStore,
} from './recordings.repository.js';

const meetingIdSchema = z.uuid();

@Injectable()
export class RecordingsService {
  constructor(
    private readonly database: DatabaseService,
    @Inject(RecordingsRepository)
    private readonly recordings: RecordingStore,
    @Inject(RECORDING_SOURCE_ADAPTER)
    private readonly source: RecordingSourceAdapter,
  ) {}

  async ensureRecordingReady(meetingId: string): Promise<RecordingRecord> {
    const parsedMeetingId = meetingIdSchema.safeParse(meetingId);
    if (!parsedMeetingId.success) {
      throw new ApplicationError('invalid_request');
    }

    const stored = await this.recordings.findByMeetingId(parsedMeetingId.data);
    if (stored) {
      return stored;
    }

    const ready = recordingReadySchema.safeParse(
      await this.source.getReadyRecording(parsedMeetingId.data),
    );
    if (!ready.success) {
      throw new ApplicationError('internal_error');
    }

    try {
      return await this.database.transaction((tx) =>
        this.insertRecording(tx, parsedMeetingId.data, ready.data.externalId),
      );
    } catch (error) {
      return this.resolveInsertConflict(error, parsedMeetingId.data);
    }
  }

  private async insertRecording(
    tx: DatabaseTransaction,
    meetingId: string,
    externalId: string,
  ): Promise<RecordingRecord> {
    const existing = await this.recordings.findByMeetingId(meetingId, tx);
    if (existing) {
      return existing;
    }

    const recording: RecordingRecord = {
      id: randomUUID(),
      meetingId,
      externalId,
    };
    await this.recordings.insert(recording, tx);
    return recording;
  }

  private async resolveInsertConflict(
    error: unknown,
    meetingId: string,
  ): Promise<RecordingRecord> {
    if (postgresErrorCode(error) === UNIQUE_VIOLATION) {
      // A failed insert aborts its transaction. Read the winning row afterwards.
      const stored = await this.recordings.findByMeetingId(meetingId);
      if (stored) {
        return stored;
      }
    }
    if (postgresErrorCode(error) === FOREIGN_KEY_VIOLATION) {
      throw new ApplicationError('not_found');
    }
    throw error;
  }
}
