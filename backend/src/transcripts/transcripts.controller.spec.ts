import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { NodeAdapter, type NestNodeApplication } from '@nestjs/platform-node';
import { ZodSerializerInterceptor } from 'nestjs-zod';
import { localSeed } from '../database/local-seed.js';
import { ApplicationExceptionFilter } from '../shared/filters/application-exception.filter.js';
import { ApplicationError } from '../shared/errors/application-error.js';
import { TranscriptsController } from './transcripts.controller.js';
import { TranscriptsService } from './transcripts.service.js';

const meetingId = localSeed.meetingId;
const callerUserId = localSeed.employees[0].id;
const transcript = {
  segments: [
    {
      speaker: { speakerId: 'speaker_1', displayName: null },
      startMs: 0,
      endMs: 1_000,
      text: 'Pierwsze zdanie.',
    },
  ],
};

describe('TranscriptsController', () => {
  let app: NestNodeApplication;
  const getTranscript = vi.fn<TranscriptsService['getTranscript']>();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TranscriptsController],
      providers: [
        { provide: TranscriptsService, useValue: { getTranscript } },
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
    getTranscript.mockReset();
  });

  async function readTranscript(
    pathMeetingId: string,
    headers?: Record<string, string>,
  ): Promise<Response> {
    const baseUrl = await app.getUrl();
    return fetch(`${baseUrl}/meetings/${pathMeetingId}/transcript`, {
      headers,
    });
  }

  it('returns the transcript with a null display name', async () => {
    getTranscript.mockResolvedValue(transcript);

    const response = await readTranscript(meetingId, {
      'X-User-Id': callerUserId,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(transcript);
    expect(getTranscript).toHaveBeenCalledWith({ meetingId, callerUserId });
  });

  it('hides a response that includes a speaker name', async () => {
    getTranscript.mockResolvedValue({
      segments: [
        {
          ...transcript.segments[0],
          speaker: { speakerId: 'speaker_1', displayName: 'Ada' },
        },
      ],
    } as unknown as Awaited<ReturnType<TranscriptsService['getTranscript']>>);

    const response = await readTranscript(meetingId, {
      'X-User-Id': callerUserId,
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'internal_error' });
  });

  it('answers not_found when the service denies the read', async () => {
    getTranscript.mockRejectedValue(new ApplicationError('not_found'));

    const response = await readTranscript(meetingId, {
      'X-User-Id': localSeed.organizer.id,
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'not_found' });
  });

  it('answers unauthenticated when the header is missing', async () => {
    const response = await readTranscript(meetingId);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'unauthenticated',
    });
    expect(getTranscript).not.toHaveBeenCalled();
  });

  it('answers invalid_request for a bad path id before checking the header', async () => {
    const response = await readTranscript('not-a-uuid');

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'invalid_request',
    });
    expect(getTranscript).not.toHaveBeenCalled();
  });
});
