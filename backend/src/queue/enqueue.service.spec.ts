import type { Queue } from 'bullmq';
import { EnqueueService } from './enqueue.service.js';
import type { JobPayload, ProcessingStep } from './job-payload.schema.js';

const meetingId = '550e8400-e29b-41d4-a716-446655440000';

function createService(add: Queue<JobPayload, void, ProcessingStep>['add']) {
  return new EnqueueService({
    add,
    on: () => undefined,
  } as unknown as Queue<JobPayload, void, ProcessingStep>);
}

describe('EnqueueService', () => {
  it('enqueues the validated payload under its step name', async () => {
    const add = vi.fn(async () => undefined);
    const service = createService(add);

    await service.enqueue({ meetingId, step: 'recording-ready' });

    expect(add).toHaveBeenCalledWith('recording-ready', {
      meetingId,
      step: 'recording-ready',
    });
  });

  it('does not enqueue a payload that fails validation', async () => {
    const add = vi.fn(async () => undefined);
    const service = createService(add);

    await expect(
      service.enqueue({
        meetingId,
        step: 'recording-ready',
        transcript: 'spoken words',
      }),
    ).rejects.toThrow();

    expect(add).not.toHaveBeenCalled();
  });
});
