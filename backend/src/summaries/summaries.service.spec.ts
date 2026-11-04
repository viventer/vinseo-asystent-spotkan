import { DrizzleQueryError } from 'drizzle-orm/errors';
import type { DatabaseTransaction } from '../database/database.js';
import { DatabaseService } from '../database/database.service.js';
import { localSeed } from '../database/local-seed.js';
import { MeetingAccessService } from '../meetings/meeting-access.service.js';
import type { MeetingReadRequest } from '../meetings/meeting-read-request.js';
import { ApplicationError } from '../shared/errors/application-error.js';
import { InvalidSummaryResultError } from '../shared/errors/invalid-summary-result.error.js';
import type { SummaryAdapter } from './adapters/summary.adapter.js';
import type {
  DecisionRecord,
  SummaryPublication,
  SummaryRecord,
  SummaryStore,
  TaskRecord,
} from './summaries.repository.js';
import { SummariesService } from './summaries.service.js';
import { TranscriptsService } from '../transcripts/transcripts.service.js';
import type { TranscriptSegmentRecord } from '../transcripts/transcripts.repository.js';

const meetingId = localSeed.meetingId;
const segments: TranscriptSegmentRecord[] = [
  {
    id: '88888888-8888-4888-8888-888888888880',
    meetingId,
    position: 0,
    speakerId: 'speaker_1',
    startMs: 0,
    endMs: 1_000,
    text: 'Pierwsze zdanie.',
  },
  {
    id: '88888888-8888-4888-8888-888888888881',
    meetingId,
    position: 1,
    speakerId: 'speaker_2',
    startMs: 1_000,
    endMs: 2_000,
    text: 'Drugie zdanie.',
  },
];
const modelResult = {
  summary: 'Ustalono termin testów.',
  decisions: [
    {
      text: 'Odbiór nastąpi po zakończeniu testów.',
      speakerIds: ['speaker_1'],
    },
  ],
  tasks: [
    {
      speakerId: 'speaker_2',
      action: 'Przygotować środowisko.',
      deadline: '2026-11-13',
    },
  ],
};
const storedSummary: SummaryRecord = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  meetingId,
  text: modelResult.summary,
};
const storedDecisions: DecisionRecord[] = [
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    meetingId,
    summaryId: storedSummary.id,
    position: 0,
    text: modelResult.decisions[0].text,
    speakerIds: ['speaker_1'],
  },
];
const storedTasks: TaskRecord[] = [
  {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    meetingId,
    summaryId: storedSummary.id,
    position: 0,
    speakerId: 'speaker_2',
    action: modelResult.tasks[0].action,
    deadline: '2026-11-13',
  },
];
const storedPublication: SummaryPublication = {
  summary: storedSummary,
  decisions: storedDecisions,
  tasks: storedTasks,
};

function queryError(code: string): DrizzleQueryError {
  const cause = new Error('postgres');
  Object.assign(cause, { code });
  return new DrizzleQueryError('insert into summaries', [], cause);
}

function createService(response: unknown = modelResult): {
  service: SummariesService;
  findSummary: ReturnType<typeof vi.fn<SummaryStore['findSummary']>>;
  findDecisions: ReturnType<typeof vi.fn<SummaryStore['findDecisions']>>;
  findTasks: ReturnType<typeof vi.fn<SummaryStore['findTasks']>>;
  insertPublication: ReturnType<
    typeof vi.fn<SummaryStore['insertPublication']>
  >;
  getStoredSegments: ReturnType<
    typeof vi.fn<TranscriptsService['getStoredSegments']>
  >;
  summarize: ReturnType<typeof vi.fn<SummaryAdapter['summarize']>>;
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
  const findSummary = vi
    .fn<SummaryStore['findSummary']>()
    .mockResolvedValue(null);
  const findDecisions = vi
    .fn<SummaryStore['findDecisions']>()
    .mockResolvedValue([]);
  const findTasks = vi.fn<SummaryStore['findTasks']>().mockResolvedValue([]);
  const insertPublication = vi
    .fn<SummaryStore['insertPublication']>()
    .mockResolvedValue(undefined);
  const getStoredSegments = vi
    .fn<TranscriptsService['getStoredSegments']>()
    .mockResolvedValue(segments);
  const summarize = vi
    .fn<SummaryAdapter['summarize']>()
    .mockResolvedValue(response);
  const getParticipantRole = vi
    .fn<MeetingAccessService['getParticipantRole']>()
    .mockResolvedValue('employee');
  const service = new SummariesService(
    { transaction } as unknown as DatabaseService,
    { getParticipantRole } as unknown as MeetingAccessService,
    { getStoredSegments } as unknown as TranscriptsService,
    { findSummary, findDecisions, findTasks, insertPublication },
    { summarize },
  );

  return {
    service,
    findSummary,
    findDecisions,
    findTasks,
    insertPublication,
    getStoredSegments,
    summarize,
    getParticipantRole,
    transaction,
    tx,
  };
}

describe('SummariesService', () => {
  it('rejects a meeting id that is not a uuid before reading or summarizing', async () => {
    const { service, findSummary, getStoredSegments, summarize, transaction } =
      createService();

    await expect(
      service.ensureSummaryPublished({ meetingId: 'meeting-1' }),
    ).rejects.toMatchObject({ code: 'invalid_request', statusCode: 400 });
    expect(findSummary).not.toHaveBeenCalled();
    expect(getStoredSegments).not.toHaveBeenCalled();
    expect(summarize).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('returns the stored publication without calling the model again', async () => {
    const {
      service,
      findSummary,
      findDecisions,
      findTasks,
      getStoredSegments,
      summarize,
      insertPublication,
      transaction,
    } = createService();
    findSummary.mockResolvedValue(storedSummary);
    findDecisions.mockResolvedValue(storedDecisions);
    findTasks.mockResolvedValue(storedTasks);

    await expect(
      service.ensureSummaryPublished({ meetingId }),
    ).resolves.toEqual(storedPublication);
    expect(getStoredSegments).not.toHaveBeenCalled();
    expect(summarize).not.toHaveBeenCalled();
    expect(insertPublication).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('does not call the model when the transcript is missing', async () => {
    const { service, getStoredSegments, summarize, transaction } =
      createService();
    getStoredSegments.mockRejectedValue(new ApplicationError('not_found'));

    await expect(
      service.ensureSummaryPublished({ meetingId }),
    ).rejects.toMatchObject({ code: 'not_found', statusCode: 404 });
    expect(summarize).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('sends only segments, local speaker ids, and unknown roles', async () => {
    const { service, summarize, insertPublication, tx } = createService();

    const published = await service.ensureSummaryPublished({ meetingId });

    expect(summarize).toHaveBeenCalledWith({
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
      speakers: [
        { speakerId: 'speaker_1', role: 'unknown' },
        { speakerId: 'speaker_2', role: 'unknown' },
      ],
    });
    expect(insertPublication).toHaveBeenCalledWith(published, tx);
    expect(published.summary).toMatchObject({
      meetingId,
      text: modelResult.summary,
    });
    expect(published.decisions).toEqual([
      expect.objectContaining({
        meetingId,
        summaryId: published.summary.id,
        position: 0,
        text: modelResult.decisions[0].text,
        speakerIds: ['speaker_1'],
      }),
    ]);
    expect(published.tasks).toEqual([
      expect.objectContaining({
        meetingId,
        summaryId: published.summary.id,
        position: 0,
        speakerId: 'speaker_2',
        action: modelResult.tasks[0].action,
        deadline: '2026-11-13',
      }),
    ]);
  });

  it('stores a summary with no decisions and no tasks', async () => {
    const empty = {
      summary: 'Ustalenia bez listy.',
      decisions: [],
      tasks: [],
    };
    const { service, insertPublication } = createService(empty);

    const published = await service.ensureSummaryPublished({ meetingId });

    expect(published.summary.text).toBe(empty.summary);
    expect(published.decisions).toEqual([]);
    expect(published.tasks).toEqual([]);
    expect(insertPublication).toHaveBeenCalledOnce();
  });

  it('stores nothing when a segment speaker id cannot be sent', async () => {
    const { service, getStoredSegments, summarize, insertPublication } =
      createService();
    getStoredSegments.mockResolvedValue([{ ...segments[0], speakerId: 'Ada' }]);

    await expect(
      service.ensureSummaryPublished({ meetingId }),
    ).rejects.toMatchObject({
      name: 'ApplicationError',
      code: 'internal_error',
      statusCode: 500,
    });
    expect(summarize).not.toHaveBeenCalled();
    expect(insertPublication).not.toHaveBeenCalled();
  });

  it.each([
    ['prose', 'Ustalenia ze spotkania.'],
    ['empty object', {}],
    ['null', null],
    ['missing summary', { decisions: [], tasks: [] }],
    ['missing decisions', { summary: 'Ustalenia.', tasks: [] }],
    ['missing tasks', { summary: 'Ustalenia.', decisions: [] }],
    ['empty summary', { summary: '   ', decisions: [], tasks: [] }],
    [
      'decision without text',
      { summary: 'Ustalenia.', decisions: [{ speakerIds: [] }], tasks: [] },
    ],
    [
      'task without a speaker',
      {
        summary: 'Ustalenia.',
        decisions: [],
        tasks: [{ action: 'Zrobić.', deadline: '2026-11-13' }],
      },
    ],
    [
      'task without an action',
      {
        summary: 'Ustalenia.',
        decisions: [],
        tasks: [{ speakerId: 'speaker_1', deadline: '2026-11-13' }],
      },
    ],
    [
      'task without a deadline',
      {
        summary: 'Ustalenia.',
        decisions: [],
        tasks: [{ speakerId: 'speaker_1', action: 'Zrobić.' }],
      },
    ],
    [
      'impossible date',
      {
        summary: 'Ustalenia.',
        decisions: [],
        tasks: [
          {
            speakerId: 'speaker_1',
            action: 'Zrobić.',
            deadline: '2026-02-31',
          },
        ],
      },
    ],
    [
      'name as a speaker',
      {
        summary: 'Ustalenia.',
        decisions: [],
        tasks: [
          { speakerId: 'Ada', action: 'Zrobić.', deadline: '2026-11-13' },
        ],
      },
    ],
    [
      'email as a speaker',
      {
        summary: 'Ustalenia.',
        decisions: [],
        tasks: [
          {
            speakerId: 'ada@example.com',
            action: 'Zrobić.',
            deadline: '2026-11-13',
          },
        ],
      },
    ],
    [
      'name quoted in a decision',
      {
        summary: 'Ustalenia.',
        decisions: [{ text: 'Zgoda.', speakerIds: ['Ada'] }],
        tasks: [],
      },
    ],
    [
      'extra person field',
      { summary: 'Ustalenia.', decisions: [], tasks: [], names: ['Ada'] },
    ],
    [
      'speaker id outside this transcript',
      {
        summary: 'Ustalenia.',
        decisions: [],
        tasks: [
          {
            speakerId: 'speaker_9',
            action: 'Zrobić.',
            deadline: '2026-11-13',
          },
        ],
      },
    ],
  ])('stores nothing when the model result is %s', async (_label, response) => {
    const { service, summarize, insertPublication, transaction } =
      createService(response);

    await expect(
      service.ensureSummaryPublished({ meetingId }),
    ).rejects.toBeInstanceOf(InvalidSummaryResultError);
    await expect(
      service.ensureSummaryPublished({ meetingId }),
    ).rejects.toMatchObject({
      name: 'InvalidSummaryResultError',
      code: 'internal_error',
      statusCode: 500,
    });
    expect(summarize).toHaveBeenCalledTimes(2);
    expect(transaction).not.toHaveBeenCalled();
    expect(insertPublication).not.toHaveBeenCalled();
  });

  it('publishes one summary when a later attempt is valid', async () => {
    const { service, summarize, insertPublication } = createService();
    summarize.mockReset();
    summarize.mockResolvedValueOnce('proza').mockResolvedValueOnce(modelResult);

    await expect(
      service.ensureSummaryPublished({ meetingId }),
    ).rejects.toBeInstanceOf(InvalidSummaryResultError);
    const published = await service.ensureSummaryPublished({ meetingId });

    expect(insertPublication).toHaveBeenCalledOnce();
    expect(published.summary.text).toBe(modelResult.summary);
    expect(published.decisions).toHaveLength(1);
    expect(published.tasks).toHaveLength(1);
  });

  it('returns a publication stored by a concurrent transaction without inserting', async () => {
    const {
      service,
      findSummary,
      findDecisions,
      findTasks,
      insertPublication,
      tx,
    } = createService();
    findSummary
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(storedSummary);
    findDecisions.mockResolvedValue(storedDecisions);
    findTasks.mockResolvedValue(storedTasks);

    await expect(
      service.ensureSummaryPublished({ meetingId }),
    ).resolves.toEqual(storedPublication);
    expect(insertPublication).not.toHaveBeenCalled();
    expect(findDecisions).toHaveBeenCalledWith(meetingId, tx);
    expect(findTasks).toHaveBeenCalledWith(meetingId, tx);
  });

  it('returns the winning rows when the insert loses a unique race', async () => {
    const {
      service,
      findSummary,
      findDecisions,
      findTasks,
      insertPublication,
    } = createService();
    findSummary
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(storedSummary);
    findDecisions.mockResolvedValue(storedDecisions);
    findTasks.mockResolvedValue(storedTasks);
    insertPublication.mockRejectedValue(queryError('23505'));

    await expect(
      service.ensureSummaryPublished({ meetingId }),
    ).resolves.toEqual(storedPublication);
    expect(findSummary).toHaveBeenLastCalledWith(meetingId);
    expect(findDecisions).toHaveBeenLastCalledWith(meetingId);
  });

  it('rethrows a unique violation when no summary is stored', async () => {
    const { service, insertPublication } = createService();
    const conflict = queryError('23505');
    insertPublication.mockRejectedValue(conflict);

    await expect(service.ensureSummaryPublished({ meetingId })).rejects.toBe(
      conflict,
    );
  });

  it('reports not_found when the meeting row does not exist', async () => {
    const { service, insertPublication } = createService();
    insertPublication.mockRejectedValue(queryError('23503'));

    await expect(
      service.ensureSummaryPublished({ meetingId }),
    ).rejects.toMatchObject({
      name: 'ApplicationError',
      code: 'not_found',
      statusCode: 404,
    });
  });

  it('rethrows an unexpected insert failure', async () => {
    const { service, insertPublication } = createService();
    const failure = new Error('connection reset');
    insertPublication.mockRejectedValue(failure);

    await expect(service.ensureSummaryPublished({ meetingId })).rejects.toBe(
      failure,
    );
  });

  it('rethrows an adapter failure without storing a summary', async () => {
    const { service, summarize, insertPublication, transaction } =
      createService();
    const failure = new Error('model timeout');
    summarize.mockRejectedValue(failure);

    await expect(service.ensureSummaryPublished({ meetingId })).rejects.toBe(
      failure,
    );
    expect(transaction).not.toHaveBeenCalled();
    expect(insertPublication).not.toHaveBeenCalled();
  });

  it('returns the summary and decisions with a null display name', async () => {
    const { service, findSummary, findDecisions, getParticipantRole } =
      createService();
    findSummary.mockResolvedValue(storedSummary);
    findDecisions.mockResolvedValue([
      { ...storedDecisions[0], speakerIds: [] },
      storedDecisions[0],
    ]);
    const request: MeetingReadRequest = {
      meetingId,
      callerUserId: localSeed.employees[0].id,
    };

    await expect(service.getSummary(request)).resolves.toEqual({
      summary: storedSummary.text,
      decisions: [
        { text: storedDecisions[0].text, speakers: [] },
        {
          text: storedDecisions[0].text,
          speakers: [{ speakerId: 'speaker_1', displayName: null }],
        },
      ],
    });
    expect(getParticipantRole).toHaveBeenCalledWith(request);
    expect(findDecisions).toHaveBeenCalledWith(meetingId);
  });

  it('returns an empty task list after the summary is published', async () => {
    const { service, findSummary, findTasks } = createService();
    findSummary.mockResolvedValue(storedSummary);

    await expect(
      service.getTasks({
        meetingId,
        callerUserId: localSeed.client.id,
      }),
    ).resolves.toEqual({ tasks: [] });
    expect(findTasks).toHaveBeenCalledWith(meetingId);
  });

  it('returns tasks in stored order with a null display name', async () => {
    const { service, findSummary, findTasks } = createService();
    findSummary.mockResolvedValue(storedSummary);
    findTasks.mockResolvedValue([
      storedTasks[0],
      {
        ...storedTasks[0],
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        position: 1,
        speakerId: 'speaker_1',
        action: 'Dokończyć listę uwag.',
      },
    ]);

    await expect(
      service.getTasks({
        meetingId,
        callerUserId: localSeed.employees[1].id,
      }),
    ).resolves.toEqual({
      tasks: [
        {
          speaker: { speakerId: 'speaker_2', displayName: null },
          action: storedTasks[0].action,
          deadline: '2026-11-13',
        },
        {
          speaker: { speakerId: 'speaker_1', displayName: null },
          action: 'Dokończyć listę uwag.',
          deadline: '2026-11-13',
        },
      ],
    });
  });

  it.each([
    ['summary', 'getSummary'],
    ['tasks', 'getTasks'],
  ] as const)(
    'answers not_found for %s when nothing is published',
    async (_label, method) => {
      const { service, findDecisions, findTasks } = createService();

      await expect(
        service[method]({
          meetingId,
          callerUserId: localSeed.employees[0].id,
        }),
      ).rejects.toMatchObject({ code: 'not_found', statusCode: 404 });
      expect(findDecisions).not.toHaveBeenCalled();
      expect(findTasks).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['organizer who did not participate', localSeed.organizer.id],
    ['caller who is not a participant', '99999999-9999-4999-8999-999999999999'],
  ])(
    'does not read a summary or tasks for a denied %s',
    async (_label, callerUserId) => {
      const { service, findSummary, getParticipantRole } = createService();
      getParticipantRole.mockRejectedValue(new ApplicationError('not_found'));
      const request = { meetingId, callerUserId };

      await expect(service.getSummary(request)).rejects.toMatchObject({
        code: 'not_found',
        statusCode: 404,
      });
      await expect(service.getTasks(request)).rejects.toMatchObject({
        code: 'not_found',
        statusCode: 404,
      });
      expect(findSummary).not.toHaveBeenCalled();
    },
  );

  it('does not publish a stored summary that breaks the response schema', async () => {
    const { service, findSummary } = createService();
    findSummary.mockResolvedValue({ ...storedSummary, text: '' });

    await expect(
      service.getSummary({
        meetingId,
        callerUserId: localSeed.employees[0].id,
      }),
    ).rejects.toMatchObject({
      name: 'ApplicationError',
      code: 'internal_error',
      statusCode: 500,
    });
  });

  it('does not publish a stored task that breaks the response schema', async () => {
    const { service, findSummary, findTasks } = createService();
    findSummary.mockResolvedValue(storedSummary);
    findTasks.mockResolvedValue([{ ...storedTasks[0], deadline: 'tomorrow' }]);

    await expect(
      service.getTasks({
        meetingId,
        callerUserId: localSeed.employees[0].id,
      }),
    ).rejects.toMatchObject({
      name: 'ApplicationError',
      code: 'internal_error',
      statusCode: 500,
    });
  });
});
