import { DrizzleQueryError } from 'drizzle-orm/errors';
import type { DatabaseTransaction } from '../database/database.js';
import { DatabaseService } from '../database/database.service.js';
import { localSeed } from '../database/local-seed.js';
import { ApplicationError } from '../shared/errors/application-error.js';
import type { RecordingSourceAdapter } from './adapters/recording-source.adapter.js';
import type {
  RecordingRecord,
  RecordingStore,
} from './recordings.repository.js';
import { RecordingsService } from './recordings.service.js';

const meetingId = localSeed.meetingId;
const stored: RecordingRecord = {
  id: '88888888-8888-4888-8888-888888888888',
  meetingId,
  externalId: `fake-recording:${meetingId}`,
};

function queryError(code: string): DrizzleQueryError {
  const cause = new Error('postgres');
  Object.assign(cause, { code });
  return new DrizzleQueryError('insert into recordings', [], cause);
}

function createService(
  response: unknown = {
    externalId: stored.externalId,
    ready: true,
  },
): {
  service: RecordingsService;
  findByMeetingId: ReturnType<typeof vi.fn<RecordingStore['findByMeetingId']>>;
  insert: ReturnType<typeof vi.fn<RecordingStore['insert']>>;
  getReadyRecording: ReturnType<
    typeof vi.fn<RecordingSourceAdapter['getReadyRecording']>
  >;
  transaction: ReturnType<typeof vi.fn>;
  tx: DatabaseTransaction;
} {
  const tx = {} as unknown as DatabaseTransaction;
  const transaction = vi.fn(
    async <T>(work: (executor: DatabaseTransaction) => Promise<T>) => work(tx),
  );
  const findByMeetingId = vi.fn<RecordingStore['findByMeetingId']>();
  const insert = vi.fn<RecordingStore['insert']>().mockResolvedValue(undefined);
  const getReadyRecording = vi
    .fn<RecordingSourceAdapter['getReadyRecording']>()
    .mockResolvedValue(response);
  const service = new RecordingsService(
    { transaction } as unknown as DatabaseService,
    { findByMeetingId, insert },
    { getReadyRecording },
  );

  return {
    service,
    findByMeetingId,
    insert,
    getReadyRecording,
    transaction,
    tx,
  };
}

describe('RecordingsService', () => {
  it('rejects a meeting id that is not a uuid before reading or calling the source', async () => {
    const { service, findByMeetingId, getReadyRecording, transaction } =
      createService();

    await expect(
      service.ensureRecordingReady('meeting-1'),
    ).rejects.toMatchObject({ code: 'invalid_request', statusCode: 400 });
    expect(findByMeetingId).not.toHaveBeenCalled();
    expect(getReadyRecording).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('returns the stored marker without calling the source again', async () => {
    const { service, findByMeetingId, insert, getReadyRecording, transaction } =
      createService();
    findByMeetingId.mockResolvedValue(stored);

    await expect(service.ensureRecordingReady(meetingId)).resolves.toEqual(
      stored,
    );
    expect(findByMeetingId).toHaveBeenCalledWith(meetingId);
    expect(getReadyRecording).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('stores the ready marker from the source in a transaction', async () => {
    const { service, findByMeetingId, insert, getReadyRecording, tx } =
      createService();
    findByMeetingId.mockResolvedValue(null);

    const recording = await service.ensureRecordingReady(meetingId);

    expect(getReadyRecording).toHaveBeenCalledWith(meetingId);
    expect(recording).toMatchObject({
      meetingId,
      externalId: stored.externalId,
    });
    expect(recording.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(findByMeetingId).toHaveBeenNthCalledWith(1, meetingId);
    expect(findByMeetingId).toHaveBeenNthCalledWith(2, meetingId, tx);
    expect(insert).toHaveBeenCalledWith(recording, tx);
  });

  it('returns a marker stored by a concurrent transaction without inserting', async () => {
    const { service, findByMeetingId, insert, transaction } = createService();
    findByMeetingId.mockResolvedValueOnce(null).mockResolvedValueOnce(stored);

    await expect(service.ensureRecordingReady(meetingId)).resolves.toEqual(
      stored,
    );
    expect(transaction).toHaveBeenCalledOnce();
    expect(insert).not.toHaveBeenCalled();
  });

  it.each([
    null,
    'ready',
    { externalId: '   ', ready: true },
    { externalId: stored.externalId, ready: false },
    { externalId: stored.externalId },
    { externalId: stored.externalId, ready: true, path: '/tmp/meeting.mp4' },
    {
      externalId: stored.externalId,
      ready: true,
      url: 'https://example.test/meeting.mp4',
    },
    { externalId: stored.externalId, ready: true, file: 'meeting.mp4' },
    { externalId: stored.externalId, ready: true, audio: 'not-audio' },
  ])(
    'stores nothing when the source response is not a ready marker: %j',
    async (response) => {
      const { service, findByMeetingId, insert, transaction } =
        createService(response);
      findByMeetingId.mockResolvedValue(null);

      await expect(
        service.ensureRecordingReady(meetingId),
      ).rejects.toBeInstanceOf(ApplicationError);
      await expect(
        service.ensureRecordingReady(meetingId),
      ).rejects.toMatchObject({ code: 'internal_error', statusCode: 500 });
      expect(transaction).not.toHaveBeenCalled();
      expect(insert).not.toHaveBeenCalled();
    },
  );

  it('returns the winning row when the insert loses a unique race', async () => {
    const { service, findByMeetingId, insert } = createService();
    findByMeetingId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(stored);
    insert.mockRejectedValue(queryError('23505'));

    await expect(service.ensureRecordingReady(meetingId)).resolves.toEqual(
      stored,
    );
    expect(findByMeetingId).toHaveBeenLastCalledWith(meetingId);
  });

  it('rethrows a unique violation when no recording row is stored', async () => {
    const { service, findByMeetingId, insert } = createService();
    const conflict = queryError('23505');
    findByMeetingId.mockResolvedValue(null);
    insert.mockRejectedValue(conflict);

    await expect(service.ensureRecordingReady(meetingId)).rejects.toBe(
      conflict,
    );
  });

  it('reports not_found when the meeting row does not exist', async () => {
    const { service, findByMeetingId, insert } = createService();
    findByMeetingId.mockResolvedValue(null);
    insert.mockRejectedValue(queryError('23503'));

    await expect(service.ensureRecordingReady(meetingId)).rejects.toMatchObject(
      {
        name: 'ApplicationError',
        code: 'not_found',
        statusCode: 404,
      },
    );
  });

  it('rethrows an unexpected insert failure', async () => {
    const { service, findByMeetingId, insert } = createService();
    const failure = new Error('connection reset');
    findByMeetingId.mockResolvedValue(null);
    insert.mockRejectedValue(failure);

    await expect(service.ensureRecordingReady(meetingId)).rejects.toBe(failure);
  });
});
