import { DrizzleQueryError } from 'drizzle-orm/errors';
import type { DatabaseTransaction } from '../database/database.js';
import { DatabaseService } from '../database/database.service.js';
import { localSeed } from '../database/local-seed.js';
import { MeetingAccessService } from '../meetings/meeting-access.service.js';
import type { MeetingReadRequest } from '../meetings/meeting-read-request.js';
import { ApplicationError } from '../shared/errors/application-error.js';
import type { TranscriptionAdapter } from './adapters/transcription.adapter.js';
import type {
  TranscriptSegmentRecord,
  TranscriptStore,
} from './transcripts.repository.js';
import { TranscriptsService } from './transcripts.service.js';

const meetingId = localSeed.meetingId;
const recordingExternalId = `fake-recording:${meetingId}`;
const transcribed = {
  segments: [
    {
      speakerId: 'speaker_1',
      startMs: 0,
      endMs: 1_000,
      text: 'Pierwsze zdanie.',
    },
    {
      speakerId: 'speaker_2',
      startMs: 1_000,
      endMs: 2_000,
      text: 'Drugie zdanie.',
    },
  ],
};
const stored: TranscriptSegmentRecord[] = transcribed.segments.map(
  (segment, position) => ({
    id: `88888888-8888-4888-8888-88888888888${position}`,
    meetingId,
    position,
    speakerId: segment.speakerId,
    startMs: segment.startMs,
    endMs: segment.endMs,
    text: segment.text,
  }),
);

function queryError(code: string): DrizzleQueryError {
  const cause = new Error('postgres');
  Object.assign(cause, { code });
  return new DrizzleQueryError('insert into transcript_segments', [], cause);
}

function createService(response: unknown = transcribed): {
  service: TranscriptsService;
  hasSegments: ReturnType<typeof vi.fn<TranscriptStore['hasSegments']>>;
  findByMeetingId: ReturnType<typeof vi.fn<TranscriptStore['findByMeetingId']>>;
  insertSegments: ReturnType<typeof vi.fn<TranscriptStore['insertSegments']>>;
  transcribe: ReturnType<typeof vi.fn<TranscriptionAdapter['transcribe']>>;
  getParticipantRole: ReturnType<
    typeof vi.fn<MeetingAccessService['getParticipantRole']>
  >;
  transaction: ReturnType<typeof vi.fn>;
  tx: DatabaseTransaction;
} {
  const tx = {} as unknown as DatabaseTransaction;
  const transaction = vi.fn(
    async <T>(work: (executor: DatabaseTransaction) => Promise<T>) => work(tx),
  );
  const hasSegments = vi
    .fn<TranscriptStore['hasSegments']>()
    .mockResolvedValue(false);
  const findByMeetingId = vi
    .fn<TranscriptStore['findByMeetingId']>()
    .mockResolvedValue([]);
  const insertSegments = vi
    .fn<TranscriptStore['insertSegments']>()
    .mockResolvedValue(undefined);
  const transcribe = vi
    .fn<TranscriptionAdapter['transcribe']>()
    .mockResolvedValue(response);
  const getParticipantRole = vi
    .fn<MeetingAccessService['getParticipantRole']>()
    .mockResolvedValue('employee');
  const service = new TranscriptsService(
    { transaction } as unknown as DatabaseService,
    { getParticipantRole } as unknown as MeetingAccessService,
    { hasSegments, findByMeetingId, insertSegments },
    { transcribe },
  );

  return {
    service,
    hasSegments,
    findByMeetingId,
    insertSegments,
    transcribe,
    getParticipantRole,
    transaction,
    tx,
  };
}

describe('TranscriptsService', () => {
  it('rejects a meeting id that is not a uuid before reading or transcribing', async () => {
    const { service, hasSegments, transcribe, transaction } = createService();

    await expect(
      service.ensureTranscriptStored({
        meetingId: 'meeting-1',
        recordingExternalId,
      }),
    ).rejects.toMatchObject({ code: 'invalid_request', statusCode: 400 });
    expect(hasSegments).not.toHaveBeenCalled();
    expect(transcribe).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects an empty recording id before reading or transcribing', async () => {
    const { service, hasSegments, transcribe } = createService();

    await expect(
      service.ensureTranscriptStored({
        meetingId,
        recordingExternalId: '   ',
      }),
    ).rejects.toMatchObject({ code: 'invalid_request', statusCode: 400 });
    expect(hasSegments).not.toHaveBeenCalled();
    expect(transcribe).not.toHaveBeenCalled();
  });

  it('returns the stored transcript without calling the adapter again', async () => {
    const {
      service,
      hasSegments,
      findByMeetingId,
      transcribe,
      insertSegments,
    } = createService();
    hasSegments.mockResolvedValue(true);
    findByMeetingId.mockResolvedValue(stored);

    await expect(
      service.ensureTranscriptStored({ meetingId, recordingExternalId }),
    ).resolves.toEqual(stored);
    expect(hasSegments).toHaveBeenCalledWith(meetingId);
    expect(findByMeetingId).toHaveBeenCalledWith(meetingId);
    expect(transcribe).not.toHaveBeenCalled();
    expect(insertSegments).not.toHaveBeenCalled();
  });

  it('stores adapter segments in order inside a transaction', async () => {
    const { service, findByMeetingId, insertSegments, transcribe, tx } =
      createService();

    const rows = await service.ensureTranscriptStored({
      meetingId,
      recordingExternalId,
    });

    expect(transcribe).toHaveBeenCalledWith({ meetingId, recordingExternalId });
    expect(rows.map((row) => row.position)).toEqual([0, 1]);
    expect(rows.map((row) => row.speakerId)).toEqual([
      'speaker_1',
      'speaker_2',
    ]);
    expect(rows.every((row) => row.meetingId === meetingId)).toBe(true);
    expect(findByMeetingId).toHaveBeenCalledWith(meetingId, tx);
    expect(insertSegments).toHaveBeenCalledWith(rows, tx);
  });

  it('returns a transcript stored by a concurrent transaction without inserting', async () => {
    const { service, findByMeetingId, insertSegments, transaction } =
      createService();
    findByMeetingId.mockResolvedValueOnce(stored);

    await expect(
      service.ensureTranscriptStored({ meetingId, recordingExternalId }),
    ).resolves.toEqual(stored);
    expect(transaction).toHaveBeenCalledOnce();
    expect(insertSegments).not.toHaveBeenCalled();
  });

  it.each([
    null,
    { segments: [] },
    { segments: [{ speakerId: ' ', startMs: 0, endMs: 1, text: 'Tak.' }] },
    {
      segments: [
        { speakerId: 'speaker_1', startMs: -1, endMs: 1, text: 'Tak.' },
      ],
    },
    {
      segments: [
        { speakerId: 'speaker_1', startMs: 5, endMs: 4, text: 'Tak.' },
      ],
    },
    {
      segments: [{ speakerId: 'speaker_1', startMs: 0, endMs: 1, text: '   ' }],
    },
    {
      segments: [
        {
          speakerId: 'speaker_1',
          startMs: 0,
          endMs: 1,
          text: 'Tak.',
          audio: 'clip',
        },
      ],
    },
  ])(
    'stores nothing when the adapter response is not a transcript: %j',
    async (response) => {
      const { service, insertSegments, transaction } = createService(response);

      await expect(
        service.ensureTranscriptStored({ meetingId, recordingExternalId }),
      ).rejects.toMatchObject({ code: 'internal_error', statusCode: 500 });
      expect(transaction).not.toHaveBeenCalled();
      expect(insertSegments).not.toHaveBeenCalled();
    },
  );

  it('returns the winning rows when the insert loses a unique race', async () => {
    const { service, findByMeetingId, insertSegments } = createService();
    findByMeetingId.mockResolvedValueOnce([]).mockResolvedValueOnce(stored);
    insertSegments.mockRejectedValue(queryError('23505'));

    await expect(
      service.ensureTranscriptStored({ meetingId, recordingExternalId }),
    ).resolves.toEqual(stored);
    expect(findByMeetingId).toHaveBeenLastCalledWith(meetingId);
  });

  it('rethrows a unique violation when no transcript is stored', async () => {
    const { service, insertSegments } = createService();
    const conflict = queryError('23505');
    insertSegments.mockRejectedValue(conflict);

    await expect(
      service.ensureTranscriptStored({ meetingId, recordingExternalId }),
    ).rejects.toBe(conflict);
  });

  it('reports not_found when the meeting row does not exist', async () => {
    const { service, insertSegments } = createService();
    insertSegments.mockRejectedValue(queryError('23503'));

    await expect(
      service.ensureTranscriptStored({ meetingId, recordingExternalId }),
    ).rejects.toMatchObject({
      name: 'ApplicationError',
      code: 'not_found',
      statusCode: 404,
    });
  });

  it('rethrows an unexpected insert failure', async () => {
    const { service, insertSegments } = createService();
    const failure = new Error('connection reset');
    insertSegments.mockRejectedValue(failure);

    await expect(
      service.ensureTranscriptStored({ meetingId, recordingExternalId }),
    ).rejects.toBe(failure);
  });

  it('returns segments in stored order with a null display name', async () => {
    const { service, findByMeetingId, getParticipantRole } = createService();
    findByMeetingId.mockResolvedValue(stored);
    const request: MeetingReadRequest = {
      meetingId,
      callerUserId: localSeed.employees[0].id,
    };

    await expect(service.getTranscript(request)).resolves.toEqual({
      segments: stored.map((segment) => ({
        speaker: { speakerId: segment.speakerId, displayName: null },
        startMs: segment.startMs,
        endMs: segment.endMs,
        text: segment.text,
      })),
    });
    expect(getParticipantRole).toHaveBeenCalledWith(request);
    expect(findByMeetingId).toHaveBeenCalledWith(meetingId);
  });

  it('answers not_found when a participant has no stored segments', async () => {
    const { service } = createService();

    await expect(
      service.getTranscript({
        meetingId,
        callerUserId: localSeed.client.id,
      }),
    ).rejects.toMatchObject({ code: 'not_found', statusCode: 404 });
  });

  it.each([
    ['organizer who did not participate', localSeed.organizer.id],
    ['caller who is not a participant', '99999999-9999-4999-8999-999999999999'],
  ])('does not read segments for a denied %s', async (_label, callerUserId) => {
    const { service, findByMeetingId, getParticipantRole } = createService();
    getParticipantRole.mockRejectedValue(new ApplicationError('not_found'));

    await expect(
      service.getTranscript({ meetingId, callerUserId }),
    ).rejects.toMatchObject({ code: 'not_found', statusCode: 404 });
    expect(findByMeetingId).not.toHaveBeenCalled();
  });

  it('returns stored segments without checking who is asking', async () => {
    const { service, findByMeetingId, getParticipantRole } = createService();
    findByMeetingId.mockResolvedValue(stored);

    await expect(service.getStoredSegments(meetingId)).resolves.toEqual(stored);
    expect(findByMeetingId).toHaveBeenCalledWith(meetingId);
    expect(getParticipantRole).not.toHaveBeenCalled();
  });

  it('answers not_found when the meeting has no stored segments', async () => {
    const { service } = createService();

    await expect(service.getStoredSegments(meetingId)).rejects.toMatchObject({
      code: 'not_found',
      statusCode: 404,
    });
  });

  it('rejects a meeting id that is not a uuid before reading segments', async () => {
    const { service, findByMeetingId } = createService();

    await expect(service.getStoredSegments('meeting-1')).rejects.toMatchObject({
      code: 'invalid_request',
      statusCode: 400,
    });
    expect(findByMeetingId).not.toHaveBeenCalled();
  });

  it('does not publish a stored transcript that breaks the response schema', async () => {
    const { service, findByMeetingId } = createService();
    findByMeetingId.mockResolvedValue([
      { ...stored[0], speakerId: '', text: 'Tak.' },
    ]);

    await expect(
      service.getTranscript({
        meetingId,
        callerUserId: localSeed.employees[1].id,
      }),
    ).rejects.toBeInstanceOf(ApplicationError);
    await expect(
      service.getTranscript({
        meetingId,
        callerUserId: localSeed.employees[1].id,
      }),
    ).rejects.toMatchObject({ code: 'internal_error', statusCode: 500 });
  });
});
