import { join } from 'node:path';
import { Test, type TestingModule } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { DatabaseModule } from '../src/database/database.module.js';
import { DatabaseService } from '../src/database/database.service.js';
import { localSeed } from '../src/database/local-seed.js';
import { seedLocalDatabase } from '../src/database/seed.js';
import { meetings } from '../src/meetings/entities/meeting.table.js';
import { MeetingAccessService } from '../src/meetings/meeting-access.service.js';
import { MeetingsModule } from '../src/meetings/meetings.module.js';
import { ApplicationError } from '../src/shared/errors/application-error.js';
import { UsersModule } from '../src/users/users.module.js';
import { UsersService } from '../src/users/users.service.js';

process.env.PORT ??= '3000';
process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5432/vinseo';
process.env.REDIS_URL ??= 'redis://localhost:6379';

const unknownUserId = '99999999-9999-4999-8999-999999999999';
const otherMeetingId = '66666666-6666-4666-8666-666666666666';

describe('users and meeting access against PostgreSQL', () => {
  let moduleRef: TestingModule;
  let database: DatabaseService;
  let meetingAccess: MeetingAccessService;
  let users: UsersService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule, UsersModule, MeetingsModule],
    }).compile();
    database = moduleRef.get(DatabaseService);
    await migrate(database.db, {
      migrationsFolder: join(import.meta.dirname, '../drizzle'),
    });
    await seedLocalDatabase(database.db);
    meetingAccess = moduleRef.get(MeetingAccessService);
    users = moduleRef.get(UsersService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('returns the stored user', async () => {
    await expect(users.findById(localSeed.employees[0].id)).resolves.toEqual({
      id: localSeed.employees[0].id,
      displayName: localSeed.employees[0].displayName,
      email: localSeed.employees[0].email,
    });
  });

  it('returns null for an unknown user id', async () => {
    await expect(users.findById(unknownUserId)).resolves.toBeNull();
  });

  it('allows an employee participant', async () => {
    await expect(
      meetingAccess.getParticipantRole({
        meetingId: localSeed.meetingId,
        callerUserId: localSeed.employees[0].id,
      }),
    ).resolves.toBe('employee');
  });

  it('allows the other employee participant', async () => {
    await expect(
      meetingAccess.getParticipantRole({
        meetingId: localSeed.meetingId,
        callerUserId: localSeed.employees[1].id,
      }),
    ).resolves.toBe('employee');
  });

  it('allows a client participant', async () => {
    await expect(
      meetingAccess.getParticipantRole({
        meetingId: localSeed.meetingId,
        callerUserId: localSeed.client.id,
      }),
    ).resolves.toBe('client');
  });

  it('denies the organizer who did not participate', async () => {
    const rows = await database.db
      .select({ organizerUserId: meetings.organizerUserId })
      .from(meetings)
      .where(eq(meetings.id, localSeed.meetingId));

    expect(rows[0]?.organizerUserId).toBe(localSeed.organizer.id);
    await expect(
      meetingAccess.getParticipantRole({
        meetingId: localSeed.meetingId,
        callerUserId: localSeed.organizer.id,
      }),
    ).rejects.toBeInstanceOf(ApplicationError);
    await expect(
      meetingAccess.getParticipantRole({
        meetingId: localSeed.meetingId,
        callerUserId: localSeed.organizer.id,
      }),
    ).rejects.toMatchObject({ code: 'not_found', statusCode: 404 });
  });

  it('denies an unknown user', async () => {
    await expect(
      meetingAccess.getParticipantRole({
        meetingId: localSeed.meetingId,
        callerUserId: unknownUserId,
      }),
    ).rejects.toMatchObject({ code: 'not_found', statusCode: 404 });
  });

  it('denies a participant when the meeting id changes', async () => {
    await expect(
      meetingAccess.getParticipantRole({
        meetingId: otherMeetingId,
        callerUserId: localSeed.employees[0].id,
      }),
    ).rejects.toMatchObject({ code: 'not_found', statusCode: 404 });
  });
});
