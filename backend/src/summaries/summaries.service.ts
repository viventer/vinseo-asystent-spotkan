import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import type {
  DatabaseExecutor,
  DatabaseTransaction,
} from '../database/database.js';
import { DatabaseService } from '../database/database.service.js';
import { MeetingAccessService } from '../meetings/meeting-access.service.js';
import type { MeetingReadRequest } from '../meetings/meeting-read-request.js';
import { ApplicationError } from '../shared/errors/application-error.js';
import { InvalidSummaryResultError } from '../shared/errors/invalid-summary-result.error.js';
import {
  FOREIGN_KEY_VIOLATION,
  postgresErrorCode,
  UNIQUE_VIOLATION,
} from '../shared/errors/postgres-error.js';
import { TranscriptsService } from '../transcripts/transcripts.service.js';
import {
  SUMMARY_ADAPTER,
  summaryResultSchema,
  type SummaryAdapter,
  type SummaryResult,
} from './adapters/summary.adapter.js';
import {
  summaryResponseSchema,
  type SummaryResponse,
} from './dto/summary-response.dto.js';
import {
  tasksResponseSchema,
  type TasksResponse,
} from './dto/tasks-response.dto.js';
import {
  SummariesRepository,
  type DecisionRecord,
  type SummaryPublication,
  type SummaryRecord,
  type SummaryStore,
  type TaskRecord,
} from './summaries.repository.js';
import { buildSummaryPayload } from './summary-payload.js';

const publishSummarySchema = z.strictObject({
  meetingId: z.uuid(),
});

@Injectable()
export class SummariesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly meetingAccess: MeetingAccessService,
    private readonly transcripts: TranscriptsService,
    @Inject(SummariesRepository)
    private readonly summaries: SummaryStore,
    @Inject(SUMMARY_ADAPTER)
    private readonly summaryModel: SummaryAdapter,
  ) {}

  async ensureSummaryPublished(input: {
    meetingId: string;
  }): Promise<SummaryPublication> {
    const parsed = publishSummarySchema.safeParse(input);
    if (!parsed.success) {
      throw new ApplicationError('invalid_request');
    }

    const existing = await this.summaries.findSummary(parsed.data.meetingId);
    if (existing) {
      return this.publicationFor(existing);
    }

    const segments = await this.transcripts.getStoredSegments(
      parsed.data.meetingId,
    );
    const payload = buildSummaryPayload(segments);
    const summarized = summaryResultSchema.safeParse(
      await this.summaryModel.summarize(payload),
    );
    if (!summarized.success) {
      throw new InvalidSummaryResultError();
    }

    const speakerIds = new Set(segments.map((segment) => segment.speakerId));
    if (!usesTranscriptSpeakers(summarized.data, speakerIds)) {
      throw new InvalidSummaryResultError();
    }

    try {
      return await this.database.transaction((tx) =>
        this.insertPublication(tx, parsed.data.meetingId, summarized.data),
      );
    } catch (error) {
      return this.resolveInsertConflict(error, parsed.data.meetingId);
    }
  }

  async getSummary(request: MeetingReadRequest): Promise<SummaryResponse> {
    await this.meetingAccess.getParticipantRole(request);

    const summary = await this.summaries.findSummary(request.meetingId);
    if (!summary) {
      throw new ApplicationError('not_found');
    }
    const decisions = await this.summaries.findDecisions(request.meetingId);
    return this.toSummaryResponse(summary, decisions);
  }

  async getTasks(request: MeetingReadRequest): Promise<TasksResponse> {
    await this.meetingAccess.getParticipantRole(request);

    const summary = await this.summaries.findSummary(request.meetingId);
    if (!summary) {
      throw new ApplicationError('not_found');
    }
    const stored = await this.summaries.findTasks(request.meetingId);
    return this.toTasksResponse(stored);
  }

  private async insertPublication(
    tx: DatabaseTransaction,
    meetingId: string,
    result: SummaryResult,
  ): Promise<SummaryPublication> {
    const existing = await this.summaries.findSummary(meetingId, tx);
    if (existing) {
      return this.publicationFor(existing, tx);
    }

    const summary: SummaryRecord = {
      id: randomUUID(),
      meetingId,
      text: result.summary,
    };
    const publication: SummaryPublication = {
      summary,
      decisions: result.decisions.map((decision, position) => ({
        id: randomUUID(),
        meetingId,
        summaryId: summary.id,
        position,
        text: decision.text,
        speakerIds: [...decision.speakerIds],
      })),
      tasks: result.tasks.map((task, position) => ({
        id: randomUUID(),
        meetingId,
        summaryId: summary.id,
        position,
        speakerId: task.speakerId,
        action: task.action,
        deadline: task.deadline,
      })),
    };
    await this.summaries.insertPublication(publication, tx);
    return publication;
  }

  private async publicationFor(
    summary: SummaryRecord,
    executor?: DatabaseExecutor,
  ): Promise<SummaryPublication> {
    const decisions = executor
      ? await this.summaries.findDecisions(summary.meetingId, executor)
      : await this.summaries.findDecisions(summary.meetingId);
    const storedTasks = executor
      ? await this.summaries.findTasks(summary.meetingId, executor)
      : await this.summaries.findTasks(summary.meetingId);
    return { summary, decisions, tasks: storedTasks };
  }

  private async resolveInsertConflict(
    error: unknown,
    meetingId: string,
  ): Promise<SummaryPublication> {
    if (postgresErrorCode(error) === UNIQUE_VIOLATION) {
      // A failed insert aborts its transaction. Read the winning rows afterwards.
      const stored = await this.summaries.findSummary(meetingId);
      if (stored) {
        return this.publicationFor(stored);
      }
    }
    if (postgresErrorCode(error) === FOREIGN_KEY_VIOLATION) {
      throw new ApplicationError('not_found');
    }
    throw error;
  }

  private toSummaryResponse(
    summary: SummaryRecord,
    decisions: readonly DecisionRecord[],
  ): SummaryResponse {
    const response = summaryResponseSchema.safeParse({
      summary: summary.text,
      decisions: decisions.map((decision) => ({
        text: decision.text,
        speakers: decision.speakerIds.map((speakerId) => ({
          speakerId,
          displayName: null,
        })),
      })),
    });
    if (!response.success) {
      throw new ApplicationError('internal_error');
    }
    return response.data;
  }

  private toTasksResponse(tasks: readonly TaskRecord[]): TasksResponse {
    const response = tasksResponseSchema.safeParse({
      tasks: tasks.map((task) => ({
        speaker: {
          speakerId: task.speakerId,
          displayName: null,
        },
        action: task.action,
        deadline: task.deadline,
      })),
    });
    if (!response.success) {
      throw new ApplicationError('internal_error');
    }
    return response.data;
  }
}

function usesTranscriptSpeakers(
  result: SummaryResult,
  speakerIds: ReadonlySet<string>,
): boolean {
  return (
    result.decisions.every((decision) =>
      decision.speakerIds.every((speakerId) => speakerIds.has(speakerId)),
    ) && result.tasks.every((task) => speakerIds.has(task.speakerId))
  );
}
