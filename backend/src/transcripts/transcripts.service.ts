import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { DatabaseTransaction } from '../database/database.js';
import { DatabaseService } from '../database/database.service.js';
import { MeetingAccessService } from '../meetings/meeting-access.service.js';
import type { MeetingReadRequest } from '../meetings/meeting-read-request.js';
import { ApplicationError } from '../shared/errors/application-error.js';
import {
  FOREIGN_KEY_VIOLATION,
  postgresErrorCode,
  UNIQUE_VIOLATION,
} from '../shared/errors/postgres-error.js';
import {
  TRANSCRIPTION_ADAPTER,
  transcriptionResultSchema,
  type TranscriptionAdapter,
  type TranscriptionSegment,
} from './adapters/transcription.adapter.js';
import {
  transcriptResponseSchema,
  type TranscriptResponse,
} from './dto/transcript-response.dto.js';
import {
  TranscriptsRepository,
  type TranscriptSegmentRecord,
  type TranscriptStore,
} from './transcripts.repository.js';

const storeTranscriptSchema = z.strictObject({
  meetingId: z.uuid(),
  recordingExternalId: z.string().trim().min(1),
});

@Injectable()
export class TranscriptsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly meetingAccess: MeetingAccessService,
    @Inject(TranscriptsRepository)
    private readonly transcripts: TranscriptStore,
    @Inject(TRANSCRIPTION_ADAPTER)
    private readonly transcription: TranscriptionAdapter,
  ) {}

  async ensureTranscriptStored(input: {
    meetingId: string;
    recordingExternalId: string;
  }): Promise<TranscriptSegmentRecord[]> {
    const parsed = storeTranscriptSchema.safeParse(input);
    if (!parsed.success) {
      throw new ApplicationError('invalid_request');
    }

    if (await this.transcripts.hasSegments(parsed.data.meetingId)) {
      return this.transcripts.findByMeetingId(parsed.data.meetingId);
    }

    const transcribed = transcriptionResultSchema.safeParse(
      await this.transcription.transcribe({
        meetingId: parsed.data.meetingId,
        recordingExternalId: parsed.data.recordingExternalId,
      }),
    );
    if (!transcribed.success) {
      throw new ApplicationError('internal_error');
    }

    try {
      return await this.database.transaction((tx) =>
        this.insertTranscript(
          tx,
          parsed.data.meetingId,
          transcribed.data.segments,
        ),
      );
    } catch (error) {
      return this.resolveInsertConflict(error, parsed.data.meetingId);
    }
  }

  async getStoredSegments(
    meetingId: string,
  ): Promise<TranscriptSegmentRecord[]> {
    const parsed = z.uuid().safeParse(meetingId);
    if (!parsed.success) {
      throw new ApplicationError('invalid_request');
    }

    const stored = await this.transcripts.findByMeetingId(parsed.data);
    if (stored.length === 0) {
      throw new ApplicationError('not_found');
    }

    return stored;
  }

  async getTranscript(
    request: MeetingReadRequest,
  ): Promise<TranscriptResponse> {
    await this.meetingAccess.getParticipantRole(request);

    const stored = await this.transcripts.findByMeetingId(request.meetingId);
    if (stored.length === 0) {
      throw new ApplicationError('not_found');
    }

    const response = transcriptResponseSchema.safeParse({
      segments: stored.map((segment) => ({
        speaker: {
          speakerId: segment.speakerId,
          displayName: null,
        },
        startMs: segment.startMs,
        endMs: segment.endMs,
        text: segment.text,
      })),
    });
    if (!response.success) {
      throw new ApplicationError('internal_error');
    }

    return response.data;
  }

  private async insertTranscript(
    tx: DatabaseTransaction,
    meetingId: string,
    segments: readonly TranscriptionSegment[],
  ): Promise<TranscriptSegmentRecord[]> {
    const existing = await this.transcripts.findByMeetingId(meetingId, tx);
    if (existing.length > 0) {
      return existing;
    }

    const rows = segments.map((segment, position) => ({
      id: randomUUID(),
      meetingId,
      position,
      speakerId: segment.speakerId,
      startMs: segment.startMs,
      endMs: segment.endMs,
      text: segment.text,
    }));
    await this.transcripts.insertSegments(rows, tx);
    return rows;
  }

  private async resolveInsertConflict(
    error: unknown,
    meetingId: string,
  ): Promise<TranscriptSegmentRecord[]> {
    if (postgresErrorCode(error) === UNIQUE_VIOLATION) {
      // A failed insert aborts its transaction. Read the winning rows afterwards.
      const stored = await this.transcripts.findByMeetingId(meetingId);
      if (stored.length > 0) {
        return stored;
      }
    }
    if (postgresErrorCode(error) === FOREIGN_KEY_VIOLATION) {
      throw new ApplicationError('not_found');
    }
    throw error;
  }
}
