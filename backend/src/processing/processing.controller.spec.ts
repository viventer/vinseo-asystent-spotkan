import { APP_INTERCEPTOR } from '@nestjs/core';
import { NodeAdapter, type NestNodeApplication } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ZodSerializerInterceptor, cleanupOpenApiDoc } from 'nestjs-zod';
import { localSeed } from '../database/local-seed.js';
import { ApplicationError } from '../shared/errors/application-error.js';
import { ApplicationExceptionFilter } from '../shared/filters/application-exception.filter.js';
import { ProcessingController } from './processing.controller.js';
import { ProcessingService } from './processing.service.js';

const meetingId = localSeed.meetingId;

describe('ProcessingController', () => {
  let app: NestNodeApplication;
  const start = vi.fn<ProcessingService['start']>();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProcessingController],
      providers: [
        { provide: ProcessingService, useValue: { start } },
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
    start.mockReset();
    start.mockResolvedValue(undefined);
  });

  async function post(pathMeetingId: string): Promise<Response> {
    const baseUrl = await app.getUrl();
    return fetch(`${baseUrl}/meetings/${pathMeetingId}/processing`, {
      method: 'POST',
    });
  }

  it('accepts processing with an empty body and no caller header', async () => {
    const response = await post(meetingId);

    expect(response.status).toBe(202);
    expect(await response.text()).toBe('');
    expect(start).toHaveBeenCalledWith(meetingId);
  });

  it('answers invalid_request for a path id that is not a uuid', async () => {
    const response = await post('not-a-uuid');

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'invalid_request',
    });
    expect(start).not.toHaveBeenCalled();
  });

  it('answers not_found when the meeting has no row', async () => {
    start.mockRejectedValue(new ApplicationError('not_found'));

    const response = await post(meetingId);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'not_found' });
  });

  it('answers internal_error when enqueueing fails', async () => {
    start.mockRejectedValue(new Error('redis unavailable'));

    const response = await post(meetingId);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'internal_error' });
  });

  it('documents the route in the OpenAPI document', () => {
    const document = cleanupOpenApiDoc(
      SwaggerModule.createDocument(
        app,
        new DocumentBuilder()
          .setTitle('Version zero API')
          .setVersion('0')
          .build(),
      ),
    );
    const operation = document.paths['/meetings/{meetingId}/processing']?.post;
    const errorSchema =
      document.components?.schemas?.MeetingReadErrorDto_Output;

    expect(operation?.requestBody).toBeUndefined();
    expect(operation?.responses?.['202']).toEqual({
      description: 'Processing was accepted.',
    });
    expect(operation?.responses?.['400']).toEqual({
      description: 'The meeting id is not a uuid.',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/MeetingReadErrorDto_Output' },
        },
      },
    });
    expect(operation?.responses?.['404']).toEqual({
      description: 'The meeting has no row.',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/MeetingReadErrorDto_Output' },
        },
      },
    });
    expect(operation?.responses?.['500']).toEqual({
      description: 'Processing could not be started.',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/MeetingReadErrorDto_Output' },
        },
      },
    });
    expect(JSON.stringify(errorSchema)).toContain('not_found');
    expect(JSON.stringify(errorSchema)).toContain('invalid_request');
    expect(JSON.stringify(errorSchema)).toContain('internal_error');
    expect(JSON.stringify(operation)).not.toContain('transcript');
  });
});
