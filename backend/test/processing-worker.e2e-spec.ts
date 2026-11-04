import './support/worker-e2e-env.js';
import { join } from 'node:path';
import { getQueueToken } from '@nestjs/bullmq';
import { Test, type TestingModule } from '@nestjs/testing';
import { Queue } from 'bullmq';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { useApiProcess, useWorkerProcess } from '../src/config/process-role.js';
import { DatabaseService } from '../src/database/database.service.js';
import { localSeed } from '../src/database/local-seed.js';
import { seedLocalDatabase } from '../src/database/seed.js';
import { meetingParticipants } from '../src/meetings/entities/meeting-participant.table.js';
import { meetings } from '../src/meetings/entities/meeting.table.js';
import { ProcessingProcessor } from '../src/processing/processing.processor.js';
import { EnqueueService } from '../src/queue/enqueue.service.js';
import { MEETING_PROCESSING_QUEUE_NAME } from '../src/queue/queue-names.js';
import { recordings } from '../src/recordings/entities/recording.table.js';
import { RecordingsService } from '../src/recordings/recordings.service.js';
import { FakeSummaryAdapter } from '../src/summaries/adapters/fake-summary.adapter.js';
import { readExampleMeetingFixture } from '../src/shared/fixtures/example-meeting-fixture.js';
import {
  SUMMARY_ADAPTER,
  summaryResultSchema,
  type SummaryAdapter,
} from '../src/summaries/adapters/summary.adapter.js';
import { transcriptionResultSchema } from '../src/transcripts/adapters/transcription.adapter.js';
import { decisions } from '../src/summaries/entities/decision.table.js';
import { summaries } from '../src/summaries/entities/summary.table.js';
import { tasks } from '../src/summaries/entities/task.table.js';
import { transcriptSegments } from '../src/transcripts/entities/transcript-segment.table.js';
import { WorkerModule } from '../src/worker.module.js';

const workerMeetingId = '86868686-8686-4686-8686-868686868686';

const fixture = readExampleMeetingFixture();
const fixtureTranscript = transcriptionResultSchema.parse(fixture.transcript);
const fixtureSummary = summaryResultSchema.parse(fixture.summary);

const publishedCounts = {
  recordings: 1,
  segments: fixtureTranscript.segments.length,
  summaries: 1,
  decisions: fixtureSummary.decisions.length,
  tasks: fixtureSummary.tasks.length,
};

interface WorkerContext {
  moduleRef: TestingModule;
  database: DatabaseService;
  queue: Queue;
  enqueue: EnqueueService;
  close: (force?: boolean) => Promise<void>;
}

describe('processing worker against Redis and PostgreSQL', () => {
  const fake = new FakeSummaryAdapter();
  const summarize = vi.fn<SummaryAdapter['summarize']>((payload) =>
    fake.summarize(payload),
  );
  let context: WorkerContext;

  beforeAll(async () => {
    await emptyQueue();
    context = await startWorker(summarize);
    await seedWorkerMeeting(context.database);
  }, 20_000);

  beforeEach(async () => {
    summarize.mockImplementation((payload) => fake.summarize(payload));
    await waitForIdle(context.queue);
    await clearWorkerMeeting(context.database);
  }, 20_000);

  afterAll(async () => {
    if (context) {
      await removeWorkerMeeting(context.database);
      await context.close();
    }
    useApiProcess();
  });

  it('runs the pipeline once and keeps the meeting', async () => {
    await enqueueRecordingReady(context);
    await waitForPublication(context.database, context.queue);
    await waitForIdle(context.queue);

    expect(await storedCounts(context.database)).toEqual(publishedCounts);
    await expect(meetingExists(context.database)).resolves.toBe(true);
  }, 20_000);

  it('does not duplicate stored results when the same step is delivered again', async () => {
    await enqueueRecordingReady(context);
    await waitForPublication(context.database, context.queue);
    await waitForIdle(context.queue);
    const completed = await completedCount(context.queue);

    await enqueueRecordingReady(context);
    await waitForCompleted(context.queue, completed + 3);

    expect(await storedCounts(context.database)).toEqual(publishedCounts);
    await expect(meetingExists(context.database)).resolves.toBe(true);
  }, 20_000);

  it('retries an invalid summary and stores it once', async () => {
    let remainingFailures = 1;
    summarize.mockImplementation((payload) => {
      if (remainingFailures > 0) {
        remainingFailures -= 1;
        return Promise.resolve({ summary: '' });
      }
      return fake.summarize(payload);
    });

    await enqueueRecordingReady(context);
    await waitForPublication(context.database, context.queue);
    await waitForIdle(context.queue);

    expect(summarize.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(await storedCounts(context.database)).toEqual(publishedCounts);
  }, 20_000);

  it('finishes the meeting once after a restart during the first step', async () => {
    const entered = deferred();
    const hold = createHold();
    const recordingsService = context.moduleRef.get(RecordingsService);
    const original =
      recordingsService.ensureRecordingReady.bind(recordingsService);
    let blocked = false;
    recordingsService.ensureRecordingReady = async (meetingId: string) => {
      if (!blocked) {
        blocked = true;
        const recording = await original(meetingId);
        entered.resolve();
        await hold.promise;
        return recording;
      }
      return original(meetingId);
    };

    await enqueueRecordingReady(context);
    await entered.promise;
    await context.close(true);
    hold.stop();
    await delay(30);

    context = await startWorker(summarize);
    await waitForPublication(context.database, context.queue);
    await waitForIdle(context.queue);

    expect(await storedCounts(context.database)).toEqual(publishedCounts);
    await expect(meetingExists(context.database)).resolves.toBe(true);
  }, 20_000);
});

async function startWorker(
  summarize: SummaryAdapter['summarize'],
): Promise<WorkerContext> {
  useWorkerProcess();
  const port = process.env.PORT;
  delete process.env.PORT;
  try {
    const moduleRef = await Test.createTestingModule({
      imports: [WorkerModule],
    })
      .overrideProvider(SUMMARY_ADAPTER)
      .useValue({ summarize })
      .compile();
    await moduleRef.init();
    const database = moduleRef.get(DatabaseService);
    await migrate(database.db, {
      migrationsFolder: join(import.meta.dirname, '../drizzle'),
    });
    await seedLocalDatabase(database.db);
    const queue = moduleRef.get<Queue>(
      getQueueToken(MEETING_PROCESSING_QUEUE_NAME),
    );
    const enqueue = moduleRef.get(EnqueueService);

    return {
      moduleRef,
      database,
      queue,
      enqueue,
      close: async (force = false) => {
        if (force) {
          await moduleRef.get(ProcessingProcessor).worker.close(true);
        }
        await moduleRef.close();
      },
    };
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

async function enqueueRecordingReady(context: WorkerContext): Promise<void> {
  await context.enqueue.enqueue({
    meetingId: workerMeetingId,
    step: 'recording-ready',
  });
}

async function storedCounts(database: DatabaseService) {
  const [recordingRows, segmentRows, summaryRows, decisionRows, taskRows] =
    await Promise.all([
      database.db
        .select({ id: recordings.id })
        .from(recordings)
        .where(eq(recordings.meetingId, workerMeetingId)),
      database.db
        .select({ id: transcriptSegments.id })
        .from(transcriptSegments)
        .where(eq(transcriptSegments.meetingId, workerMeetingId)),
      database.db
        .select({ id: summaries.id })
        .from(summaries)
        .where(eq(summaries.meetingId, workerMeetingId)),
      database.db
        .select({ id: decisions.id })
        .from(decisions)
        .where(eq(decisions.meetingId, workerMeetingId)),
      database.db
        .select({ id: tasks.id })
        .from(tasks)
        .where(eq(tasks.meetingId, workerMeetingId)),
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
    .where(eq(meetings.id, workerMeetingId));
  return rows.length === 1;
}

async function waitForPublication(
  database: DatabaseService,
  queue: Queue,
): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < 15_000) {
    const rows = await database.db
      .select({ id: summaries.id })
      .from(summaries)
      .where(eq(summaries.meetingId, workerMeetingId));
    if (rows.length === 1) {
      return;
    }
    await delay(40);
  }
  const counts = await queue.getJobCounts();
  const failed = await queue.getFailed(0, 5);
  const reasons = failed
    .map((job) => job.failedReason)
    .join(' | ')
    .slice(0, 500);
  throw new Error(
    `The summary was not published. counts=${JSON.stringify(counts)} failed=${reasons}`,
  );
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
    const completed = await completedCount(queue);
    if (completed >= minimum && (await pendingCount(queue)) === 0) {
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

async function seedWorkerMeeting(database: DatabaseService): Promise<void> {
  await database.db
    .insert(meetings)
    .values({
      id: workerMeetingId,
      organizerUserId: localSeed.organizer.id,
    })
    .onConflictDoNothing({ target: meetings.id });
  await database.db
    .insert(meetingParticipants)
    .values([
      {
        meetingId: workerMeetingId,
        userId: localSeed.employees[0].id,
        role: 'employee',
      },
      {
        meetingId: workerMeetingId,
        userId: localSeed.employees[1].id,
        role: 'employee',
      },
      {
        meetingId: workerMeetingId,
        userId: localSeed.client.id,
        role: 'client',
      },
    ])
    .onConflictDoNothing({
      target: [meetingParticipants.meetingId, meetingParticipants.userId],
    });
}

async function clearWorkerMeeting(database: DatabaseService): Promise<void> {
  await database.db.delete(tasks).where(eq(tasks.meetingId, workerMeetingId));
  await database.db
    .delete(decisions)
    .where(eq(decisions.meetingId, workerMeetingId));
  await database.db
    .delete(summaries)
    .where(eq(summaries.meetingId, workerMeetingId));
  await database.db
    .delete(transcriptSegments)
    .where(eq(transcriptSegments.meetingId, workerMeetingId));
  await database.db
    .delete(recordings)
    .where(eq(recordings.meetingId, workerMeetingId));
}

async function removeWorkerMeeting(database: DatabaseService): Promise<void> {
  await clearWorkerMeeting(database);
  await database.db
    .delete(meetingParticipants)
    .where(eq(meetingParticipants.meetingId, workerMeetingId));
  await database.db.delete(meetings).where(eq(meetings.id, workerMeetingId));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function createHold(): { promise: Promise<void>; stop: () => void } {
  let rejectHold: (error: Error) => void = () => undefined;
  const promise = new Promise<void>((_resolve, reject) => {
    rejectHold = reject;
  });
  return {
    promise,
    stop: () => {
      rejectHold(new Error('worker stopped'));
    },
  };
}
