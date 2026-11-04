import { Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import type { DatabaseExecutor } from '../database/database.js';
import { DatabaseService } from '../database/database.service.js';
import { transcriptSegments } from './entities/transcript-segment.table.js';

export interface TranscriptSegmentRecord {
  id: string;
  meetingId: string;
  position: number;
  speakerId: string;
  startMs: number;
  endMs: number;
  text: string;
}

export interface TranscriptStore {
  hasSegments(meetingId: string, executor?: DatabaseExecutor): Promise<boolean>;
  insertSegments(
    segments: readonly TranscriptSegmentRecord[],
    executor: DatabaseExecutor,
  ): Promise<void>;
  findByMeetingId(
    meetingId: string,
    executor?: DatabaseExecutor,
  ): Promise<TranscriptSegmentRecord[]>;
}

@Injectable()
export class TranscriptsRepository implements TranscriptStore {
  constructor(private readonly database: DatabaseService) {}

  async hasSegments(
    meetingId: string,
    executor?: DatabaseExecutor,
  ): Promise<boolean> {
    const rows = await this.executor(executor)
      .select({ id: transcriptSegments.id })
      .from(transcriptSegments)
      .where(eq(transcriptSegments.meetingId, meetingId))
      .limit(1);

    return rows.length > 0;
  }

  async insertSegments(
    segments: readonly TranscriptSegmentRecord[],
    executor: DatabaseExecutor,
  ): Promise<void> {
    if (segments.length === 0) {
      return;
    }

    await executor.insert(transcriptSegments).values(
      segments.map((segment) => ({
        id: segment.id,
        meetingId: segment.meetingId,
        position: segment.position,
        speakerId: segment.speakerId,
        startMs: segment.startMs,
        endMs: segment.endMs,
        text: segment.text,
      })),
    );
  }

  async findByMeetingId(
    meetingId: string,
    executor?: DatabaseExecutor,
  ): Promise<TranscriptSegmentRecord[]> {
    return this.executor(executor)
      .select({
        id: transcriptSegments.id,
        meetingId: transcriptSegments.meetingId,
        position: transcriptSegments.position,
        speakerId: transcriptSegments.speakerId,
        startMs: transcriptSegments.startMs,
        endMs: transcriptSegments.endMs,
        text: transcriptSegments.text,
      })
      .from(transcriptSegments)
      .where(eq(transcriptSegments.meetingId, meetingId))
      .orderBy(asc(transcriptSegments.position));
  }

  private executor(executor?: DatabaseExecutor): DatabaseExecutor {
    return executor ?? this.database.db;
  }
}
