import { join } from 'node:path';
import { Test, type TestingModule } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { DatabaseModule } from '../src/database/database.module.js';
import { DatabaseService } from '../src/database/database.service.js';
import { localSeed } from '../src/database/local-seed.js';
import { seedLocalDatabase } from '../src/database/seed.js';
import { recordings } from '../src/recordings/entities/recording.table.js';
import { RecordingsModule } from '../src/recordings/recordings.module.js';
import { RecordingsService } from '../src/recordings/recordings.service.js';
import { ApplicationError } from '../src/shared/errors/application-error.js';

process.env.PORT ??= '3000';
process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5432/vinseo_test';
process.env.REDIS_URL ??= 'redis://localhost:6379';

const missingMeetingId = '77777777-7777-4777-8777-777777777777';

describe('recording ready marker against PostgreSQL', () => {
  let moduleRef: TestingModule;
  let database: DatabaseService;
  let recordingsService: RecordingsService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule, RecordingsModule],
    }).compile();
    database = moduleRef.get(DatabaseService);
    await migrate(database.db, {
      migrationsFolder: join(import.meta.dirname, '../drizzle'),
    });
    await seedLocalDatabase(database.db);
    recordingsService = moduleRef.get(RecordingsService);
  });

  beforeEach(async () => {
    await database.db
      .delete(recordings)
      .where(eq(recordings.meetingId, localSeed.meetingId));
  });

  afterAll(async () => {
    await database.db
      .delete(recordings)
      .where(eq(recordings.meetingId, localSeed.meetingId));
    await moduleRef.close();
  });

  it('stores one ready marker and returns it on the next call', async () => {
    const first = await recordingsService.ensureRecordingReady(
      localSeed.meetingId,
    );
    const second = await recordingsService.ensureRecordingReady(
      localSeed.meetingId,
    );

    expect(second).toEqual(first);
    expect(first).toMatchObject({
      meetingId: localSeed.meetingId,
      externalId: `fake-recording:${localSeed.meetingId}`,
    });

    const rows = await database.db
      .select({
        id: recordings.id,
        meetingId: recordings.meetingId,
        externalId: recordings.externalId,
      })
      .from(recordings)
      .where(eq(recordings.meetingId, localSeed.meetingId));

    expect(rows).toEqual([first]);
  });

  it('keeps a single row when two calls store the marker together', async () => {
    const [left, right] = await Promise.all([
      recordingsService.ensureRecordingReady(localSeed.meetingId),
      recordingsService.ensureRecordingReady(localSeed.meetingId),
    ]);

    expect(right).toEqual(left);

    const rows = await database.db
      .select({ id: recordings.id })
      .from(recordings)
      .where(eq(recordings.meetingId, localSeed.meetingId));

    expect(rows).toEqual([{ id: left.id }]);
  });

  it('stores nothing when the meeting does not exist', async () => {
    await expect(
      recordingsService.ensureRecordingReady(missingMeetingId),
    ).rejects.toBeInstanceOf(ApplicationError);
    await expect(
      recordingsService.ensureRecordingReady(missingMeetingId),
    ).rejects.toMatchObject({ code: 'not_found', statusCode: 404 });

    const rows = await database.db
      .select({ id: recordings.id })
      .from(recordings)
      .where(eq(recordings.meetingId, missingMeetingId));

    expect(rows).toHaveLength(0);
  });
});
