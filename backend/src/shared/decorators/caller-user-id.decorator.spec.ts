import { Controller, Get, Param } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NodeAdapter, type NestNodeApplication } from '@nestjs/platform-node';
import { ApplicationError } from '../errors/application-error.js';
import { ApplicationExceptionFilter } from '../filters/application-exception.filter.js';
import { ParseUuidPipe } from '../pipes/parse-uuid.pipe.js';
import { CallerUserId, parseCallerUserId } from './caller-user-id.decorator.js';

const userId = '22222222-2222-4222-8222-222222222222';
const meetingId = '55555555-5555-4555-8555-555555555555';

@Controller('meetings')
class MeetingReadProbeController {
  @Get(':meetingId/transcript')
  read(
    @CallerUserId() callerUserId: string,
    @Param('meetingId', ParseUuidPipe) pathMeetingId: string,
  ): { meetingId: string; callerUserId: string } {
    return { meetingId: pathMeetingId, callerUserId };
  }
}

function expectUnauthenticated(header: unknown): void {
  try {
    parseCallerUserId(header);
    throw new Error('expected parseCallerUserId to throw');
  } catch (error) {
    expect(error).toBeInstanceOf(ApplicationError);
    expect(error).toMatchObject({
      code: 'unauthenticated',
      statusCode: 401,
    });
  }
}

describe('parseCallerUserId', () => {
  it('returns a uuid header', () => {
    expect(parseCallerUserId(userId)).toBe(userId);
  });

  it('rejects a missing header', () => {
    expectUnauthenticated(undefined);
  });

  it('rejects a header that is not a uuid', () => {
    expectUnauthenticated('organizer');
  });

  it('rejects a repeated header', () => {
    expectUnauthenticated([userId, userId]);
  });
});

describe('CallerUserId', () => {
  let app: NestNodeApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [MeetingReadProbeController],
    }).compile();
    app = moduleRef.createNestApplication(new NodeAdapter());
    app.useGlobalFilters(new ApplicationExceptionFilter());
    await app.listen(0);
  });

  afterAll(async () => {
    await app.close();
  });

  async function readMeeting(
    pathMeetingId: string,
    headers?: Record<string, string>,
  ): Promise<Response> {
    const baseUrl = await app.getUrl();
    return fetch(`${baseUrl}/meetings/${pathMeetingId}/transcript`, {
      headers,
    });
  }

  it('returns the caller after a valid path id', async () => {
    const response = await readMeeting(meetingId, { 'X-User-Id': userId });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      meetingId,
      callerUserId: userId,
    });
  });

  it('answers unauthenticated when the header is missing', async () => {
    const response = await readMeeting(meetingId);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'unauthenticated',
    });
  });

  it('answers unauthenticated when the header is not a uuid', async () => {
    const response = await readMeeting(meetingId, { 'X-User-Id': 'organizer' });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'unauthenticated',
    });
  });

  it('answers invalid_request for a bad path id before checking the header', async () => {
    const missingHeader = await readMeeting('not-a-uuid');
    const invalidHeader = await readMeeting('not-a-uuid', {
      'X-User-Id': 'organizer',
    });

    expect(missingHeader.status).toBe(400);
    await expect(missingHeader.json()).resolves.toEqual({
      error: 'invalid_request',
    });
    expect(invalidHeader.status).toBe(400);
    await expect(invalidHeader.json()).resolves.toEqual({
      error: 'invalid_request',
    });
  });
});
