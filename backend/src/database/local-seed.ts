const organizerId = '11111111-1111-4111-8111-111111111111';
const employeeOneId = '22222222-2222-4222-8222-222222222222';
const employeeTwoId = '33333333-3333-4333-8333-333333333333';
const clientId = '44444444-4444-4444-8444-444444444444';
const meetingId = '55555555-5555-4555-8555-555555555555';

export interface LocalSeedUser {
  id: string;
  displayName: string;
  email: string;
}

export interface LocalSeedParticipant {
  meetingId: string;
  userId: string;
  role: 'employee' | 'client';
}

export const localSeed = {
  meetingId,
  organizer: {
    id: organizerId,
    displayName: 'Example Organizer',
    email: 'organizer@example.com',
  },
  employees: [
    {
      id: employeeOneId,
      displayName: 'Example Employee One',
      email: 'employee.one@example.com',
    },
    {
      id: employeeTwoId,
      displayName: 'Example Employee Two',
      email: 'employee.two@example.com',
    },
  ],
  client: {
    id: clientId,
    displayName: 'Example Client',
    email: 'client@example.com',
  },
} as const satisfies {
  meetingId: string;
  organizer: LocalSeedUser;
  employees: readonly LocalSeedUser[];
  client: LocalSeedUser;
};

export function localSeedUsers(): readonly LocalSeedUser[] {
  return [localSeed.organizer, ...localSeed.employees, localSeed.client];
}

export function localSeedParticipants(): readonly LocalSeedParticipant[] {
  return [
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
  ];
}
