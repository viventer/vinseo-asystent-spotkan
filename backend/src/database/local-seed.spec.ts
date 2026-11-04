import { z } from 'zod';
import {
  localSeed,
  localSeedParticipants,
  localSeedUsers,
} from './local-seed.js';

const uuidSchema = z.uuid();

describe('localSeed', () => {
  it('describes one meeting with two employees, one client, and an organizer who is stored separately', () => {
    const users = localSeedUsers();
    const participants = localSeedParticipants();

    expect(users.map((user) => user.id)).toEqual([
      localSeed.organizer.id,
      localSeed.employees[0].id,
      localSeed.employees[1].id,
      localSeed.client.id,
    ]);
    expect(new Set(users.map((user) => user.id)).size).toBe(users.length);
    expect(new Set(users.map((user) => user.email)).size).toBe(users.length);
    expect(users.every((user) => user.email.endsWith('@example.com'))).toBe(
      true,
    );
    expect(participants).toEqual([
      {
        meetingId: localSeed.meetingId,
        userId: localSeed.employees[0].id,
        role: 'employee',
      },
      {
        meetingId: localSeed.meetingId,
        userId: localSeed.employees[1].id,
        role: 'employee',
      },
      {
        meetingId: localSeed.meetingId,
        userId: localSeed.client.id,
        role: 'client',
      },
    ]);

    for (const id of [...users.map((user) => user.id), localSeed.meetingId]) {
      expect(uuidSchema.safeParse(id).success).toBe(true);
    }
  });
});
