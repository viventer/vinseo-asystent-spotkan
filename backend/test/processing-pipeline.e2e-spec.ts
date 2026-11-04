import './support/pipeline-e2e-env.js';
import { join } from 'node:path';
import { getQueueToken } from '@nestjs/bullmq';
import type { NestNodeApplication } from '@nestjs/platform-node';
import { Test, type TestingModule } from '@nestjs/testing';
import { Queue } from 'bullmq';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { AppModule } from '../src/app.module.js';
import { useApiProcess, useWorkerProcess } from '../src/config/process-role.js';
import { DatabaseService } from '../src/database/database.service.js';
import { localSeed } from '../src/database/local-seed.js';
import { seedLocalDatabase } from '../src/database/seed.js';
import { meetingParticipants } from '../src/meetings/entities/meeting-participant.table.js';
import { meetings } from '../src/meetings/entities/meeting.table.js';
import { ProcessingProcessor } from '../src/processing/processing.processor.js';
import { MEETING_PROCESSING_QUEUE_NAME } from '../src/queue/queue-names.js';
import { recordings } from '../src/recordings/entities/recording.table.js';
import { FakeSummaryAdapter } from '../src/summaries/adapters/fake-summary.adapter.js';
import {
  summaryResultSchema,
  type SummaryResult,
} from '../src/summaries/adapters/summary.adapter.js';
import { decisions } from '../src/summaries/entities/decision.table.js';
import { summaries } from '../src/summaries/entities/summary.table.js';
import { tasks } from '../src/summaries/entities/task.table.js';
import { summaryResponseSchema } from '../src/summaries/dto/summary-response.dto.js';
import { tasksResponseSchema } from '../src/summaries/dto/tasks-response.dto.js';
import { FakeTranscriptionAdapter } from '../src/transcripts/adapters/fake-transcription.adapter.js';
import {
  transcriptionResultSchema,
  type TranscriptionResult,
} from '../src/transcripts/adapters/transcription.adapter.js';
import { transcriptResponseSchema } from '../src/transcripts/dto/transcript-response.dto.js';
import { transcriptSegments } from '../src/transcripts/entities/transcript-segment.table.js';
import { WorkerModule } from '../src/worker.module.js';
import { createTestApp } from './support/create-test-app.js';
import { readMeetingResource } from './support/http.js';

const pipelineMeetingId = '88888888-8888-4888-8888-888888888888';
const missingMeetingId = '01010101-0101-4010-8010-010101010101';

interface PipelineContext {
  app: NestNodeApplication;
  database: DatabaseService;
  worker: TestingModule;
  queue: Queue;
  close: () => Promise<void>;
}

describe('processing over HTTP, PostgreSQL, and BullMQ', () => {
  let context: PipelineContext;
  let expectedTranscript: TranscriptionResult;
  let expectedSummary: SummaryResult;

  beforeAll(async () => {
    expectedTranscript = transcriptionResultSchema.parse(
      await new FakeTranscriptionAdapter().transcribe({
        meetingId: pipelineMeetingId,
        recordingExternalId: 'unused',
      }),
    );
    expectedSummary = summaryResultSchema.parse(
      await new FakeSummaryAdapter().summarize(undefined),
    );
    await emptyQueue();
    context = await startPipeline();
    await seedPipelineMeeting(context.database);
  }, 30_000);

  beforeEach(async () => {
    await waitForIdle(context.queue);
    await clearPipelineMeeting(context.database);
  }, 20_000);

  afterAll(async () => {
    if (context) {
      await removePipelineMeeting(context.database);
      await context.close();
    }
    await emptyQueue();
    useApiProcess();
  });

  it('rejects a bad id and a missing meeting without enqueueing work', async () => {
    const before = await trackedJobs(context.queue);

    const invalid = await postProcessing(context.app, 'not-a-uuid');
    const missing = await postProcessing(context.app, missingMeetingId);

    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({ error: 'invalid_request' });
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ error: 'not_found' });
    expect(await trackedJobs(context.queue)).toBe(before);
  });

  it('publishes one result for a participant and denies the organizer', async () => {
    const accepted = await postProcessing(context.app, pipelineMeetingId);
    expect(accepted.status).toBe(202);
    expect(await accepted.text()).toBe('');

    const published = await waitForPublished(context);
    expect(published.transcript).toEqual({
      segments: expectedTranscript.segments.map((segment) => ({
        speaker: { speakerId: segment.speakerId, displayName: null },
        startMs: segment.startMs,
        endMs: segment.endMs,
        text: segment.text,
      })),
    });
    expect(published.summary).toEqual({
      summary: expectedSummary.summary,
      decisions: expectedSummary.decisions.map((decision) => ({
        text: decision.text,
        speakers: decision.speakerIds.map((speakerId) => ({
          speakerId,
          displayName: null,
        })),
      })),
    });
    expect(published.tasks).toEqual({
      tasks: expectedSummary.tasks.map((task) => ({
        speaker: { speakerId: task.speakerId, displayName: null },
        action: task.action,
        deadline: task.deadline,
      })),
    });
    expect(await storedCounts(context.database)).toEqual({
      recordings: 1,
      segments: expectedTranscript.segments.length,
      summaries: 1,
      decisions: expectedSummary.decisions.length,
      tasks: expectedSummary.tasks.length,
    });
    await expect(meetingExists(context.database)).resolves.toBe(true);

    for (const userId of [localSeed.employees[1].id, localSeed.client.id]) {
      const summary = await readMeetingResource(
        context.app,
        'summary',
        pipelineMeetingId,
        userId,
      );
      expect(summary.status).toBe(200);
      expect(summaryResponseSchema.parse(await summary.json())).toEqual(
        published.summary,
      );
    }

    for (const path of ['transcript', 'summary', 'tasks'] as const) {
      const denied = await readMeetingResource(
        context.app,
        path,
        pipelineMeetingId,
        localSeed.organizer.id,
      );
      expect(denied.status).toBe(404);
      await expect(denied.json()).resolves.toEqual({ error: 'not_found' });
    }

    await waitForIdle(context.queue);
    const completed = await completedCount(context.queue);
    const repeated = await postProcessing(context.app, pipelineMeetingId);
    expect(repeated.status).toBe(202);
    expect(await repeated.text()).toBe('');
    await waitForCompleted(context.queue, completed + 3);

    expect(await storedCounts(context.database)).toEqual({
      recordings: 1,
      segments: expectedTranscript.segments.length,
      summaries: 1,
      decisions: expectedSummary.decisions.length,
      tasks: expectedSummary.tasks.length,
    });
  }, 20_000);
});

async function startPipeline(): Promise<PipelineContext> {
  const testApp = await createTestApp({ imports: [AppModule] });
  useWorkerProcess();
  const port = process.env.PORT;
  delete process.env.PORT;
  let worker: TestingModule | undefined;
  try {
    const started = await Test.createTestingModule({
      imports: [WorkerModule],
    }).compile();
    worker = started;
    await started.init();
    const database = started.get(DatabaseService);
    await migrate(database.db, {
      migrationsFolder: join(import.meta.dirname, '../drizzle'),
    });
    await seedLocalDatabase(database.db);
    const queue = started.get<Queue>(
      getQueueToken(MEETING_PROCESSING_QUEUE_NAME),
    );

    return {
      app: testApp.app,
      database: testApp.database,
      worker: started,
      queue,
      close: async () => {
        await started.get(ProcessingProcessor).worker.close();
        await started.close();
        await testApp.app.close();
      },
    };
  } catch (error) {
    await worker?.close();
    await testApp.app.close();
    throw error;
  } finally {
    if (port === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = port;
    }
  }
}

async function emptyQueue(): Promise<void> {
  const queue = new Queue(MEETING_PROCESSING_QUEUE_NAME, {
    connection: {
      url: process.env.REDIS_URL,
      maxRetriesPerRequest: null,
    },
    prefix: process.env.QUEUE_PREFIX,
  });
  try {
    await queue.obliterate({ force: true });
  } finally {
    await queue.close();
  }
}

async function postProcessing(
  app: NestNodeApplication,
  meetingId: string,
): Promise<Response> {
  const baseUrl = await app.getUrl();
  return fetch(`${baseUrl}/meetings/${meetingId}/processing`, {
    method: 'POST',
  });
}

async function waitForPublished(context: PipelineContext): Promise<{
  transcript: ReturnType<typeof transcriptResponseSchema.parse>;
  summary: ReturnType<typeof summaryResponseSchema.parse>;
  tasks: ReturnType<typeof tasksResponseSchema.parse>;
}> {
  const callerUserId = localSeed.employees[0].id;
  const started = Date.now();
  while (Date.now() - started < 15_000) {
    const responses = await Promise.all(
      (['transcript', 'summary', 'tasks'] as const).map((path) =>
        readMeetingResource(context.app, path, pipelineMeetingId, callerUserId),
      ),
    );
    if (responses.every((response) => response.status === 200)) {
      const [transcript, summary, tasksResponse] = responses;
      return {
        transcript: transcriptResponseSchema.parse(await transcript.json()),
        summary: summaryResponseSchema.parse(await summary.json()),
        tasks: tasksResponseSchema.parse(await tasksResponse.json()),
      };
    }
    const unexpected = responses.find(
      (response) => response.status !== 200 && response.status !== 404,
    );
    await Promise.all(responses.map((response) => response.text()));
    if (unexpected) {
      throw new Error(`Unexpected read status ${unexpected.status}`);
    }
    await delay(40);
  }
  const counts = await context.queue.getJobCounts();
  throw new Error(
    `The pipeline did not publish. counts=${JSON.stringify(counts)}`,
  );
}

async function storedCounts(database: DatabaseService) {
  const [recordingRows, segmentRows, summaryRows, decisionRows, taskRows] =
    await Promise.all([
      database.db
        .select({ id: recordings.id })
        .from(recordings)
        .where(eq(recordings.meetingId, pipelineMeetingId)),
      database.db
        .select({ id: transcriptSegments.id })
        .from(transcriptSegments)
        .where(eq(transcriptSegments.meetingId, pipelineMeetingId)),
      database.db
        .select({ id: summaries.id })
        .from(summaries)
        .where(eq(summaries.meetingId, pipelineMeetingId)),
      database.db
        .select({ id: decisions.id })
        .from(decisions)
        .where(eq(decisions.meetingId, pipelineMeetingId)),
      database.db
        .select({ id: tasks.id })
        .from(tasks)
        .where(eq(tasks.meetingId, pipelineMeetingId)),
    ]);

  return {
    recordings: recordingRows.length,
    segments: segmentRows.length,
    summaries: summaryRows.length,
    decisions: decisionRows.length,
    tasks: taskRows.length,
  };
}

async function meetingExists(database: DatabaseService): Promise<boolean> {
  const rows = await database.db
    .select({ id: meetings.id })
    .from(meetings)
    .where(eq(meetings.id, pipelineMeetingId));
  return rows.length === 1;
}

async function trackedJobs(queue: Queue): Promise<number> {
  const counts = await queue.getJobCounts(
    'active',
    'waiting',
    'delayed',
    'completed',
    'failed',
  );
  return Object.values(counts).reduce((sum, count) => sum + (count ?? 0), 0);
}

async function waitForIdle(queue: Queue): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < 15_000) {
    if ((await pendingCount(queue)) === 0) {
      return;
    }
    await delay(40);
  }
  throw new Error('The queue did not drain.');
}

async function waitForCompleted(queue: Queue, minimum: number): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < 15_000) {
    if (
      (await completedCount(queue)) >= minimum &&
      (await pendingCount(queue)) === 0
    ) {
      return;
    }
    await delay(40);
  }
  throw new Error(`The queue did not reach ${minimum} completed jobs.`);
}

async function completedCount(queue: Queue): Promise<number> {
  const counts = await queue.getJobCounts('completed');
  return counts.completed ?? 0;
}

async function pendingCount(queue: Queue): Promise<number> {
  const counts = await queue.getJobCounts('active', 'waiting', 'delayed');
  return (counts.active ?? 0) + (counts.waiting ?? 0) + (counts.delayed ?? 0);
}

async function seedPipelineMeeting(database: DatabaseService): Promise<void> {
  await database.db
    .insert(meetings)
    .values({
      id: pipelineMeetingId,
      organizerUserId: localSeed.organizer.id,
    })
    .onConflictDoNothing({ target: meetings.id });
  await database.db
    .insert(meetingParticipants)
    .values([
      {
        meetingId: pipelineMeetingId,
        userId: localSeed.employees[0].id,
        role: 'employee',
      },
      {
        meetingId: pipelineMeetingId,
        userId: localSeed.employees[1].id,
        role: 'employee',
      },
      {
        meetingId: pipelineMeetingId,
        userId: localSeed.client.id,
        role: 'client',
      },
    ])
    .onConflictDoNothing({
      target: [meetingParticipants.meetingId, meetingParticipants.userId],
    });
}

async function clearPipelineMeeting(database: DatabaseService): Promise<void> {
  await database.db.delete(tasks).where(eq(tasks.meetingId, pipelineMeetingId));
  await database.db
    .delete(decisions)
    .where(eq(decisions.meetingId, pipelineMeetingId));
  await database.db
    .delete(summaries)
    .where(eq(summaries.meetingId, pipelineMeetingId));
  await database.db
    .delete(transcriptSegments)
    .where(eq(transcriptSegments.meetingId, pipelineMeetingId));
  await database.db
    .delete(recordings)
    .where(eq(recordings.meetingId, pipelineMeetingId));
}

async function removePipelineMeeting(database: DatabaseService): Promise<void> {
  await clearPipelineMeeting(database);
  await database.db
    .delete(meetingParticipants)
    .where(eq(meetingParticipants.meetingId, pipelineMeetingId));
  await database.db.delete(meetings).where(eq(meetings.id, pipelineMeetingId));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
