import type { DatabaseExecutor } from '../database/database.js';
import { ApplicationError } from '../shared/errors/application-error.js';
import { localSeed } from '../database/local-seed.js';
import type { MeetingReadRequest } from './meeting-read-request.js';
import { MeetingAccessService } from './meeting-access.service.js';
import type {
  ParticipantLookup,
  ParticipantRole,
} from './meetings.repository.js';

const employeeRequest: MeetingReadRequest = {
  meetingId: localSeed.meetingId,
  callerUserId: localSeed.employees[0].id,
};

function createService(role: ParticipantRole | null): {
  service: MeetingAccessService;
  findParticipantRole: ReturnType<
    typeof vi.fn<ParticipantLookup['findParticipantRole']>
  >;
} {
  const findParticipantRole = vi
    .fn<ParticipantLookup['findParticipantRole']>()
    .mockResolvedValue(role);
  const service = new MeetingAccessService({
    findParticipantRole,
  });

  return { service, findParticipantRole };
}

describe('MeetingAccessService', () => {
  it('returns the employee role for a participant', async () => {
    const { service, findParticipantRole } = createService('employee');

    await expect(service.getParticipantRole(employeeRequest)).resolves.toBe(
      'employee',
    );
    expect(findParticipantRole).toHaveBeenCalledWith(
      employeeRequest.meetingId,
      employeeRequest.callerUserId,
      undefined,
    );
  });

  it('returns the client role for a participant', async () => {
    const { service } = createService('client');
    const request: MeetingReadRequest = {
      meetingId: localSeed.meetingId,
      callerUserId: localSeed.client.id,
    };

    await expect(service.getParticipantRole(request)).resolves.toBe('client');
  });

  it('denies a user who is not a participant', async () => {
    const { service } = createService(null);

    await expect(
      service.getParticipantRole(employeeRequest),
    ).rejects.toMatchObject({
      name: 'ApplicationError',
      code: 'not_found',
      statusCode: 404,
    });
  });

  it('denies the organizer when they have no participant row', async () => {
    const { service, findParticipantRole } = createService(null);
    const request: MeetingReadRequest = {
      meetingId: localSeed.meetingId,
      callerUserId: localSeed.organizer.id,
    };

    await expect(service.getParticipantRole(request)).rejects.toBeInstanceOf(
      ApplicationError,
    );
    await expect(service.getParticipantRole(request)).rejects.toMatchObject({
      code: 'not_found',
    });
    expect(findParticipantRole).toHaveBeenCalledWith(
      localSeed.meetingId,
      localSeed.organizer.id,
      undefined,
    );
  });

  it('denies an unknown user id', async () => {
    const { service } = createService(null);

    await expect(
      service.getParticipantRole({
        meetingId: localSeed.meetingId,
        callerUserId: '99999999-9999-4999-8999-999999999999',
      }),
    ).rejects.toMatchObject({ code: 'not_found', statusCode: 404 });
  });

  it('denies a different meeting id for a real participant', async () => {
    const { service, findParticipantRole } = createService(null);
    const meetingId = '66666666-6666-4666-8666-666666666666';

    await expect(
      service.getParticipantRole({
        meetingId,
        callerUserId: localSeed.employees[0].id,
      }),
    ).rejects.toMatchObject({ code: 'not_found' });
    expect(findParticipantRole).toHaveBeenCalledWith(
      meetingId,
      localSeed.employees[0].id,
      undefined,
    );
  });

  it('rejects a request that is not a pair of uuids before querying', async () => {
    const { service, findParticipantRole } = createService('employee');

    await expect(
      service.getParticipantRole({
        meetingId: 'meeting-1',
        callerUserId: localSeed.employees[0].id,
      } as MeetingReadRequest),
    ).rejects.toMatchObject({
      code: 'invalid_request',
      statusCode: 400,
    });
    expect(findParticipantRole).not.toHaveBeenCalled();
  });

  it('forwards a transaction to the repository', async () => {
    const { service, findParticipantRole } = createService('employee');
    const executor = {} as DatabaseExecutor;

    await service.getParticipantRole(employeeRequest, executor);

    expect(findParticipantRole).toHaveBeenCalledWith(
      employeeRequest.meetingId,
      employeeRequest.callerUserId,
      executor,
    );
  });
});
