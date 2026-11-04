import { APP_INTERCEPTOR } from '@nestjs/core';
import { NodeAdapter, type NestNodeApplication } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import { ZodSerializerInterceptor } from 'nestjs-zod';
import { localSeed } from '../database/local-seed.js';
import { ApplicationError } from '../shared/errors/application-error.js';
import { ApplicationExceptionFilter } from '../shared/filters/application-exception.filter.js';
import { SummariesController } from './summaries.controller.js';
import { SummariesService } from './summaries.service.js';

const meetingId = localSeed.meetingId;
const callerUserId = localSeed.employees[0].id;
const summary = {
  summary: 'Ustalono termin testów.',
  decisions: [
    {
      text: 'Odbiór nastąpi po zakończeniu testów.',
      speakers: [{ speakerId: 'speaker_1', displayName: null }],
    },
  ],
};
const tasks = {
  tasks: [
    {
      speaker: { speakerId: 'speaker_2', displayName: null },
      action: 'Przygotować środowisko.',
      deadline: '2026-11-13',
    },
  ],
};

describe('SummariesController', () => {
  let app: NestNodeApplication;
  const getSummary = vi.fn<SummariesService['getSummary']>();
  const getTasks = vi.fn<SummariesService['getTasks']>();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SummariesController],
      providers: [
        {
          provide: SummariesService,
          useValue: { getSummary, getTasks },
        },
        { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
      ],
    }).compile();
    app = moduleRef.createNestApplication(new NodeAdapter());
    app.useGlobalFilters(new ApplicationExceptionFilter());
    await app.listen(0);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    getSummary.mockReset();
    getTasks.mockReset();
  });

  async function read(
    path: 'summary' | 'tasks',
    pathMeetingId: string,
    headers?: Record<string, string>,
  ): Promise<Response> {
    const baseUrl = await app.getUrl();
    return fetch(`${baseUrl}/meetings/${pathMeetingId}/${path}`, { headers });
  }

  it('returns the summary with a null display name', async () => {
    getSummary.mockResolvedValue(summary);

    const response = await read('summary', meetingId, {
      'X-User-Id': callerUserId,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(summary);
    expect(getSummary).toHaveBeenCalledWith({ meetingId, callerUserId });
  });

  it('returns the tasks with a null display name', async () => {
    getTasks.mockResolvedValue(tasks);

    const response = await read('tasks', meetingId, {
      'X-User-Id': callerUserId,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(tasks);
    expect(getTasks).toHaveBeenCalledWith({ meetingId, callerUserId });
  });

  it('hides a summary that includes a speaker name', async () => {
    getSummary.mockResolvedValue({
      ...summary,
      decisions: [
        {
          ...summary.decisions[0],
          speakers: [{ speakerId: 'speaker_1', displayName: 'Ada' }],
        },
      ],
    } as unknown as Awaited<ReturnType<SummariesService['getSummary']>>);

    const response = await read('summary', meetingId, {
      'X-User-Id': callerUserId,
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'internal_error' });
  });

  it('answers not_found when the service denies the read', async () => {
    getSummary.mockRejectedValue(new ApplicationError('not_found'));
    getTasks.mockRejectedValue(new ApplicationError('not_found'));

    const summaryResponse = await read('summary', meetingId, {
      'X-User-Id': localSeed.organizer.id,
    });
    const tasksResponse = await read('tasks', meetingId, {
      'X-User-Id': localSeed.organizer.id,
    });

    expect(summaryResponse.status).toBe(404);
    expect(tasksResponse.status).toBe(404);
    await expect(summaryResponse.json()).resolves.toEqual({
      error: 'not_found',
    });
    await expect(tasksResponse.json()).resolves.toEqual({ error: 'not_found' });
  });

  it.each(['summary', 'tasks'] as const)(
    'answers unauthenticated when the %s header is missing',
    async (path) => {
      const response = await read(path, meetingId);

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({
        error: 'unauthenticated',
      });
      expect(getSummary).not.toHaveBeenCalled();
      expect(getTasks).not.toHaveBeenCalled();
    },
  );

  it.each(['summary', 'tasks'] as const)(
    'answers invalid_request for a bad %s path id before checking the header',
    async (path) => {
      const response = await read(path, 'not-a-uuid');

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: 'invalid_request',
      });
      expect(getSummary).not.toHaveBeenCalled();
      expect(getTasks).not.toHaveBeenCalled();
    },
  );
});
