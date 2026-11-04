import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { Env } from '../config/config.module.js';
import { ApplicationError } from '../shared/errors/application-error.js';
import { StepTimeoutError } from '../shared/with-timeout.js';
import {
  ProcessingProcessor,
  processingFailureMessage,
  processingWorkerOptions,
} from './processing.processor.js';
import type { ProcessingService } from './processing.service.js';

const meetingId = '55555555-5555-4555-8555-555555555555';

const env = {
  WORKER_STEP_TIMEOUT_MS: 30_000,
} as Env;

function createProcessor(runStep: ProcessingService['runStep']) {
  return new ProcessingProcessor(
    { runStep } as unknown as ProcessingService,
    env,
  );
}

describe('processingWorkerOptions', () => {
  it('uses the configured concurrency and lock timing', () => {
    expect(
      processingWorkerOptions({
        WORKER_CONCURRENCY: '2',
        WORKER_LOCK_DURATION_MS: '400',
        WORKER_STALLED_INTERVAL_MS: '500',
      }),
    ).toMatchObject({
      concurrency: 2,
      lockDuration: 400,
      stalledInterval: 500,
      maxStalledCount: 1,
    });
  });
});

describe('ProcessingProcessor', () => {
  it('delegates the job payload to the processing service', async () => {
    const runStep = vi.fn<ProcessingService['runStep']>().mockResolvedValue();
    const processor = createProcessor(runStep);
    const payload = { meetingId, step: 'transcribe' as const };

    await processor.process({ data: payload } as Job);

    expect(runStep).toHaveBeenCalledExactlyOnceWith(payload);
  });

  it('rejects an invalid payload through the processing service', async () => {
    const runStep = vi
      .fn<ProcessingService['runStep']>()
      .mockRejectedValue(new ApplicationError('invalid_request'));
    const processor = createProcessor(runStep);

    await expect(
      processor.process({ data: { meetingId } } as Job),
    ).rejects.toMatchObject({ code: 'invalid_request' });
  });

  it('rejects when the step exceeds the configured timeout', async () => {
    const runStep = vi.fn<ProcessingService['runStep']>(
      () => new Promise(() => undefined),
    );
    const processor = new ProcessingProcessor(
      { runStep } as unknown as ProcessingService,
      { ...env, WORKER_STEP_TIMEOUT_MS: 15 },
    );

    await expect(
      processor.process({
        data: { meetingId, step: 'recording-ready' },
      } as Job),
    ).rejects.toBeInstanceOf(StepTimeoutError);
  });
});

describe('processingFailureMessage', () => {
  it('names the meeting, step, attempt, and error code', () => {
    const message = processingFailureMessage(
      {
        data: { meetingId, step: 'summarize-and-publish' },
        attemptsMade: 2,
      } as Job,
      new ApplicationError('internal_error'),
    );

    expect(message).toBe(
      `Processing job failed meetingId=${meetingId} step=summarize-and-publish attempt=2 error=internal_error`,
    );
  });

  it('does not include the error text or an invalid payload', () => {
    const logged = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const processor = createProcessor(vi.fn());
    const secret = 'person@example.com said the transcript words';

    try {
      processor.onFailed(
        { data: { secret }, attemptsMade: 1 } as Job,
        new Error(secret),
      );

      expect(logged).toHaveBeenCalledExactlyOnceWith(
        'Processing job failed meetingId=unknown step=unknown attempt=1 error=Error',
      );
      expect(String(logged.mock.calls[0]?.[0])).not.toContain('example.com');
      expect(String(logged.mock.calls[0]?.[0])).not.toContain('transcript words');
    } finally {
      logged.mockRestore();
    }
  });
});
