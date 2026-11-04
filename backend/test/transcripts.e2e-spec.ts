import { join } from 'node:path';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { NodeAdapter, type NestNodeApplication } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { DatabaseModule } from '../src/database/database.module.js';
import { DatabaseService } from '../src/database/database.service.js';
import { localSeed } from '../src/database/local-seed.js';
import { seedLocalDatabase } from '../src/database/seed.js';
import { MeetingsModule } from '../src/meetings/meetings.module.js';
import { ApplicationError } from '../src/shared/errors/application-error.js';
import { ApplicationExceptionFilter } from '../src/shared/filters/application-exception.filter.js';
import { readExampleMeetingFixture } from '../src/shared/fixtures/example-meeting-fixture.js';
import { transcriptionResultSchema } from '../src/transcripts/adapters/transcription.adapter.js';
import { transcriptSegments } from '../src/transcripts/entities/transcript-segment.table.js';
import { TranscriptsModule } from '../src/transcripts/transcripts.module.js';
import { TranscriptsService } from '../src/transcripts/transcripts.service.js';

process.env.PORT ??= '3000';
process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5432/vinseo_test';
process.env.REDIS_URL ??= 'redis://localhost:6379';

const missingMeetingId = '77777777-7777-4777-8777-777777777777';
const unknownUserId = '99999999-9999-4999-8999-999999999999';
const otherMeetingId = '66666666-6666-4666-8666-666666666666';
const recordingExternalId = `fake-recording:${localSeed.meetingId}`;
const segmentCount = transcriptionResultSchema.parse(
  readExampleMeetingFixture().transcript,
).segments.length;

describe('transcript segments against PostgreSQL', () => {
  let app: NestNodeApplication;
  let database: DatabaseService;
  let transcriptsService: TranscriptsService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule, MeetingsModule, TranscriptsModule],
      providers: [
        { provide: APP_PIPE, useClass: ZodValidationPipe },
        { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
      ],
    }).compile();
    database = moduleRef.get(DatabaseService);
    await migrate(database.db, {
      migrationsFolder: join(import.meta.dirname, '../drizzle'),
    });
    await seedLocalDatabase(database.db);
    transcriptsService = moduleRef.get(TranscriptsService);
    app = moduleRef.createNestApplication(new NodeAdapter());
    app.useGlobalFilters(new ApplicationExceptionFilter());
    await app.listen(0);
  });

  beforeEach(async () => {
    await database.db
      .delete(transcriptSegments)
      .where(eq(transcriptSegments.meetingId, localSeed.meetingId));
  });

  afterAll(async () => {
    await database.db
      .delete(transcriptSegments)
      .where(eq(transcriptSegments.meetingId, localSeed.meetingId));
    await app.close();
  });

  async function readTranscript(
    meetingId: string,
    userId?: string,
  ): Promise<Response> {
    const headers = userId === undefined ? undefined : { 'X-User-Id': userId };
    const baseUrl = await app.getUrl();
    return fetch(`${baseUrl}/meetings/${meetingId}/transcript`, { headers });
  }

  async function storedRows(): Promise<
    { position: number; speakerId: string; text: string }[]
  > {
    return database.db
      .select({
        position: transcriptSegments.position,
        speakerId: transcriptSegments.speakerId,
        text: transcriptSegments.text,
      })
      .from(transcriptSegments)
      .where(eq(transcriptSegments.meetingId, localSeed.meetingId))
      .orderBy(transcriptSegments.position);
  }

  it('stores one transcript and returns it on the next call', async () => {
    const first = await transcriptsService.ensureTranscriptStored({
      meetingId: localSeed.meetingId,
      recordingExternalId,
    });
    const second = await transcriptsService.ensureTranscriptStored({
      meetingId: localSeed.meetingId,
      recordingExternalId,
    });

    expect(second).toEqual(first);
    expect(first).toHaveLength(segmentCount);
    expect(first.map((segment) => segment.position)).toEqual(
      Array.from({ length: segmentCount }, (_, index) => index),
    );

    const rows = await storedRows();
    expect(rows).toEqual(
      first.map((segment) => ({
        position: segment.position,
        speakerId: segment.speakerId,
        text: segment.text,
      })),
    );
  });

  it('keeps a single transcript when two calls store it together', async () => {
    const [left, right] = await Promise.all([
      transcriptsService.ensureTranscriptStored({
        meetingId: localSeed.meetingId,
        recordingExternalId,
      }),
      transcriptsService.ensureTranscriptStored({
        meetingId: localSeed.meetingId,
        recordingExternalId,
      }),
    ]);

    expect(right).toEqual(left);
    await expect(storedRows()).resolves.toHaveLength(segmentCount);
  });

  it('stores nothing when the meeting does not exist', async () => {
    await expect(
      transcriptsService.ensureTranscriptStored({
        meetingId: missingMeetingId,
        recordingExternalId: `fake-recording:${missingMeetingId}`,
      }),
    ).rejects.toBeInstanceOf(ApplicationError);
    await expect(
      transcriptsService.ensureTranscriptStored({
        meetingId: missingMeetingId,
        recordingExternalId: `fake-recording:${missingMeetingId}`,
      }),
    ).rejects.toMatchObject({ code: 'not_found', statusCode: 404 });

    const rows = await database.db
      .select({ id: transcriptSegments.id })
      .from(transcriptSegments)
      .where(eq(transcriptSegments.meetingId, missingMeetingId));
    expect(rows).toHaveLength(0);
  });

  it('lets every participant read the stored transcript', async () => {
    await transcriptsService.ensureTranscriptStored({
      meetingId: localSeed.meetingId,
      recordingExternalId,
    });

    for (const userId of [
      localSeed.employees[0].id,
      localSeed.employees[1].id,
      localSeed.client.id,
    ]) {
      const response = await readTranscript(localSeed.meetingId, userId);
      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        segments: {
          speaker: { speakerId: string; displayName: null };
          startMs: number;
          endMs: number;
          text: string;
        }[];
      };
      expect(body.segments).toHaveLength(segmentCount);
      expect(
        body.segments.map((segment) => segment.speaker.displayName),
      ).toEqual(Array.from({ length: segmentCount }, () => null));
      expect(body.segments.map((segment) => segment.text)).toEqual(
        (await storedRows()).map((row) => row.text),
      );
    }
  });

  it('answers not_found for a participant before the transcript is stored', async () => {
    const response = await readTranscript(
      localSeed.meetingId,
      localSeed.employees[0].id,
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'not_found' });
  });

  it.each([
    ['organizer who did not participate', localSeed.organizer.id],
    ['unknown user', unknownUserId],
  ])('denies a %s', async (_label, userId) => {
    await transcriptsService.ensureTranscriptStored({
      meetingId: localSeed.meetingId,
      recordingExternalId,
    });

    const response = await readTranscript(localSeed.meetingId, userId);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'not_found' });
  });

  it('denies a participant when the meeting id changes', async () => {
    await transcriptsService.ensureTranscriptStored({
      meetingId: localSeed.meetingId,
      recordingExternalId,
    });

    const response = await readTranscript(
      otherMeetingId,
      localSeed.employees[0].id,
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'not_found' });
  });

  it('answers unauthenticated when the header is missing', async () => {
    const response = await readTranscript(localSeed.meetingId);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'unauthenticated',
    });
  });

  it('answers invalid_request for a bad path id before checking the header', async () => {
    const response = await readTranscript('not-a-uuid');

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'invalid_request',
    });
  });
});
