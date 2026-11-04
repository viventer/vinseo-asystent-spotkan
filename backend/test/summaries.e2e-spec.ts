import { eq } from 'drizzle-orm';
import type { NestNodeApplication } from '@nestjs/platform-node';
import { localSeed } from '../src/database/local-seed.js';
import type { DatabaseService } from '../src/database/database.service.js';
import { DatabaseModule } from '../src/database/database.module.js';
import { MeetingsModule } from '../src/meetings/meetings.module.js';
import { InvalidSummaryResultError } from '../src/shared/errors/invalid-summary-result.error.js';
import { FakeSummaryAdapter } from '../src/summaries/adapters/fake-summary.adapter.js';
import {
  SUMMARY_ADAPTER,
  type SummaryAdapter,
} from '../src/summaries/adapters/summary.adapter.js';
import { decisions } from '../src/summaries/entities/decision.table.js';
import { summaries } from '../src/summaries/entities/summary.table.js';
import { tasks } from '../src/summaries/entities/task.table.js';
import { SummariesModule } from '../src/summaries/summaries.module.js';
import { SummariesService } from '../src/summaries/summaries.service.js';
import { TranscriptsModule } from '../src/transcripts/transcripts.module.js';
import { TranscriptsService } from '../src/transcripts/transcripts.service.js';
import { createTestApp } from './support/create-test-app.js';
import { readMeetingResource } from './support/http.js';
import {
  clearFixtureMeeting,
  fixtureMeetingId,
  missingMeetingId,
  removeFixtureMeeting,
  seedFixtureMeeting,
  storeFixtureTranscript,
  unknownUserId,
} from './support/meeting-fixture.js';

const participantIds = [
  localSeed.employees[0].id,
  localSeed.employees[1].id,
  localSeed.client.id,
];

describe('summaries against PostgreSQL', () => {
  const fake = new FakeSummaryAdapter();
  const summarize = vi.fn<SummaryAdapter['summarize']>((payload) =>
    fake.summarize(payload),
  );
  let app: NestNodeApplication;
  let database: DatabaseService;
  let summariesService: SummariesService;
  let transcriptsService: TranscriptsService;

  beforeAll(async () => {
    const testApp = await createTestApp({
      imports: [
        DatabaseModule,
        MeetingsModule,
        TranscriptsModule,
        SummariesModule,
      ],
      overrides: [{ provide: SUMMARY_ADAPTER, useValue: { summarize } }],
    });
    app = testApp.app;
    database = testApp.database;
    summariesService = testApp.moduleRef.get(SummariesService);
    transcriptsService = testApp.moduleRef.get(TranscriptsService);
    await seedFixtureMeeting(database);
  });

  beforeEach(async () => {
    summarize.mockImplementation((payload) => fake.summarize(payload));
    await clearFixtureMeeting(database);
  });

  afterAll(async () => {
    await removeFixtureMeeting(database);
    await app.close();
  });

  it('publishes one summary and lets every participant read it', async () => {
    await storeFixtureTranscript(transcriptsService);
    const first = await publish();
    const second = await publish();

    expect(second).toEqual(first);
    await expect(storedCounts()).resolves.toEqual({
      summaries: 1,
      decisions: first.decisions.length,
      tasks: first.tasks.length,
    });

    for (const userId of participantIds) {
      const summaryResponse = await read('summary', fixtureMeetingId, userId);
      const tasksResponse = await read('tasks', fixtureMeetingId, userId);

      expect(summaryResponse.status).toBe(200);
      expect(tasksResponse.status).toBe(200);
      await expect(summaryResponse.json()).resolves.toEqual({
        summary: first.summary.text,
        decisions: first.decisions.map((decision) => ({
          text: decision.text,
          speakers: decision.speakerIds.map((speakerId) => ({
            speakerId,
            displayName: null,
          })),
        })),
      });
      await expect(tasksResponse.json()).resolves.toEqual({
        tasks: first.tasks.map((task) => ({
          speaker: { speakerId: task.speakerId, displayName: null },
          action: task.action,
          deadline: task.deadline,
        })),
      });
    }
  });

  it('keeps a single publication when two calls store it together', async () => {
    await storeFixtureTranscript(transcriptsService);

    const [left, right] = await Promise.all([publish(), publish()]);

    expect(right).toEqual(left);
    await expect(storedCounts()).resolves.toMatchObject({ summaries: 1 });
  });

  it('stores nothing when the meeting does not exist', async () => {
    await expect(
      summariesService.ensureSummaryPublished({ meetingId: missingMeetingId }),
    ).rejects.toMatchObject({ code: 'not_found', statusCode: 404 });

    const rows = await database.db
      .select({ id: summaries.id })
      .from(summaries)
      .where(eq(summaries.meetingId, missingMeetingId));
    expect(rows).toHaveLength(0);
  });

  it('answers not_found before publication and still returns the transcript', async () => {
    await storeFixtureTranscript(transcriptsService);

    const summaryResponse = await read(
      'summary',
      fixtureMeetingId,
      localSeed.employees[0].id,
    );
    const tasksResponse = await read(
      'tasks',
      fixtureMeetingId,
      localSeed.employees[0].id,
    );
    const transcriptResponse = await read(
      'transcript',
      fixtureMeetingId,
      localSeed.employees[0].id,
    );

    expect(summaryResponse.status).toBe(404);
    expect(tasksResponse.status).toBe(404);
    expect(transcriptResponse.status).toBe(200);
    await expect(summaryResponse.json()).resolves.toEqual({
      error: 'not_found',
    });
  });

  it.each([
    ['organizer who did not participate', localSeed.organizer.id],
    ['unknown user', unknownUserId],
  ])('denies a %s', async (_label, userId) => {
    await storeFixtureTranscript(transcriptsService);
    await publish();

    const summaryResponse = await read('summary', fixtureMeetingId, userId);
    const tasksResponse = await read('tasks', fixtureMeetingId, userId);

    expect(summaryResponse.status).toBe(404);
    expect(tasksResponse.status).toBe(404);
    await expect(summaryResponse.json()).resolves.toEqual({
      error: 'not_found',
    });
    await expect(tasksResponse.json()).resolves.toEqual({ error: 'not_found' });
  });

  it('denies a participant of another meeting', async () => {
    await storeFixtureTranscript(transcriptsService);
    await publish();

    const response = await read(
      'summary',
      missingMeetingId,
      localSeed.employees[0].id,
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'not_found' });
  });

  it('answers unauthenticated when the header is missing', async () => {
    const response = await read('tasks', fixtureMeetingId);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'unauthenticated',
    });
  });

  it('answers invalid_request for a bad path id before checking the header', async () => {
    const response = await read('summary', 'not-a-uuid');

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'invalid_request',
    });
  });

  it('publishes nothing when the model result is rejected', async () => {
    await storeFixtureTranscript(transcriptsService);
    summarize.mockResolvedValueOnce('To jest zwykły opis, nie struktura.');

    await expect(publish()).rejects.toBeInstanceOf(InvalidSummaryResultError);
    await expect(storedCounts()).resolves.toEqual({
      summaries: 0,
      decisions: 0,
      tasks: 0,
    });

    const transcriptResponse = await read(
      'transcript',
      fixtureMeetingId,
      localSeed.employees[0].id,
    );
    const summaryResponse = await read(
      'summary',
      fixtureMeetingId,
      localSeed.employees[0].id,
    );
    const tasksResponse = await read(
      'tasks',
      fixtureMeetingId,
      localSeed.employees[0].id,
    );
    expect(transcriptResponse.status).toBe(200);
    expect(summaryResponse.status).toBe(404);
    expect(tasksResponse.status).toBe(404);
  });

  it('publishes once after a later valid result and allows an empty task list', async () => {
    await storeFixtureTranscript(transcriptsService);
    summarize.mockResolvedValueOnce({ summary: '', decisions: [], tasks: [] });
    await expect(publish()).rejects.toBeInstanceOf(InvalidSummaryResultError);

    summarize.mockResolvedValueOnce({
      summary: 'Spotkanie bez zadań.',
      decisions: [{ text: 'Nie ma nowych zadań.', speakerIds: [] }],
      tasks: [],
    });
    const first = await publish();
    const second = await publish();

    expect(second).toEqual(first);
    await expect(storedCounts()).resolves.toEqual({
      summaries: 1,
      decisions: 1,
      tasks: 0,
    });

    const summaryResponse = await read(
      'summary',
      fixtureMeetingId,
      localSeed.employees[0].id,
    );
    const tasksResponse = await read(
      'tasks',
      fixtureMeetingId,
      localSeed.employees[0].id,
    );
    expect(summaryResponse.status).toBe(200);
    await expect(summaryResponse.json()).resolves.toEqual({
      summary: 'Spotkanie bez zadań.',
      decisions: [{ text: 'Nie ma nowych zadań.', speakers: [] }],
    });
    expect(tasksResponse.status).toBe(200);
    await expect(tasksResponse.json()).resolves.toEqual({ tasks: [] });
  });

  function publish(): ReturnType<SummariesService['ensureSummaryPublished']> {
    return summariesService.ensureSummaryPublished({
      meetingId: fixtureMeetingId,
    });
  }

  function read(
    path: string,
    meetingId: string,
    userId?: string,
  ): Promise<Response> {
    return readMeetingResource(app, path, meetingId, userId);
  }

  async function storedCounts(): Promise<{
    summaries: number;
    decisions: number;
    tasks: number;
  }> {
    const [summaryRows, decisionRows, taskRows] = await Promise.all([
      database.db
        .select({ id: summaries.id })
        .from(summaries)
        .where(eq(summaries.meetingId, fixtureMeetingId)),
      database.db
        .select({ id: decisions.id })
        .from(decisions)
        .where(eq(decisions.meetingId, fixtureMeetingId)),
      database.db
        .select({ id: tasks.id })
        .from(tasks)
        .where(eq(tasks.meetingId, fixtureMeetingId)),
    ]);
    return {
      summaries: summaryRows.length,
      decisions: decisionRows.length,
      tasks: taskRows.length,
    };
  }
});
