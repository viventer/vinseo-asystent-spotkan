import { Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import type { DatabaseExecutor } from '../database/database.js';
import { DatabaseService } from '../database/database.service.js';
import { decisions } from './entities/decision.table.js';
import { summaries } from './entities/summary.table.js';
import { tasks } from './entities/task.table.js';

export interface SummaryRecord {
  id: string;
  meetingId: string;
  text: string;
}

export interface DecisionRecord {
  id: string;
  meetingId: string;
  summaryId: string | null;
  position: number;
  text: string;
  speakerIds: string[];
}

export interface TaskRecord {
  id: string;
  meetingId: string;
  summaryId: string | null;
  position: number;
  speakerId: string;
  action: string;
  deadline: string;
}

export interface SummaryPublication {
  summary: SummaryRecord;
  decisions: DecisionRecord[];
  tasks: TaskRecord[];
}

export interface SummaryStore {
  findSummary(
    meetingId: string,
    executor?: DatabaseExecutor,
  ): Promise<SummaryRecord | null>;
  findDecisions(
    meetingId: string,
    executor?: DatabaseExecutor,
  ): Promise<DecisionRecord[]>;
  findTasks(
    meetingId: string,
    executor?: DatabaseExecutor,
  ): Promise<TaskRecord[]>;
  insertPublication(
    publication: SummaryPublication,
    executor: DatabaseExecutor,
  ): Promise<void>;
}

@Injectable()
export class SummariesRepository implements SummaryStore {
  constructor(private readonly database: DatabaseService) {}

  async findSummary(
    meetingId: string,
    executor?: DatabaseExecutor,
  ): Promise<SummaryRecord | null> {
    const rows = await this.executor(executor)
      .select({
        id: summaries.id,
        meetingId: summaries.meetingId,
        text: summaries.text,
      })
      .from(summaries)
      .where(eq(summaries.meetingId, meetingId))
      .limit(1);

    return rows[0] ?? null;
  }

  async findDecisions(
    meetingId: string,
    executor?: DatabaseExecutor,
  ): Promise<DecisionRecord[]> {
    return this.executor(executor)
      .select({
        id: decisions.id,
        meetingId: decisions.meetingId,
        summaryId: decisions.summaryId,
        position: decisions.position,
        text: decisions.text,
        speakerIds: decisions.speakerIds,
      })
      .from(decisions)
      .where(eq(decisions.meetingId, meetingId))
      .orderBy(asc(decisions.position));
  }

  async findTasks(
    meetingId: string,
    executor?: DatabaseExecutor,
  ): Promise<TaskRecord[]> {
    return this.executor(executor)
      .select({
        id: tasks.id,
        meetingId: tasks.meetingId,
        summaryId: tasks.summaryId,
        position: tasks.position,
        speakerId: tasks.speakerId,
        action: tasks.action,
        deadline: tasks.deadline,
      })
      .from(tasks)
      .where(eq(tasks.meetingId, meetingId))
      .orderBy(asc(tasks.position));
  }

  async insertPublication(
    publication: SummaryPublication,
    executor: DatabaseExecutor,
  ): Promise<void> {
    await executor.insert(summaries).values({
      id: publication.summary.id,
      meetingId: publication.summary.meetingId,
      text: publication.summary.text,
    });

    if (publication.decisions.length > 0) {
      await executor.insert(decisions).values(
        publication.decisions.map((decision) => ({
          id: decision.id,
          meetingId: decision.meetingId,
          summaryId: decision.summaryId,
          position: decision.position,
          text: decision.text,
          speakerIds: [...decision.speakerIds],
        })),
      );
    }

    if (publication.tasks.length > 0) {
      await executor.insert(tasks).values(
        publication.tasks.map((task) => ({
          id: task.id,
          meetingId: task.meetingId,
          summaryId: task.summaryId,
          position: task.position,
          speakerId: task.speakerId,
          action: task.action,
          deadline: task.deadline,
        })),
      );
    }
  }

  private executor(executor?: DatabaseExecutor): DatabaseExecutor {
    return executor ?? this.database.db;
  }
}
