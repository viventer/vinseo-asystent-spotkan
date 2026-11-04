import {
  completedJobRetention,
  failedJobRetention,
  meetingProcessingJobOptions,
} from './job-options.js';

describe('meetingProcessingJobOptions', () => {
  it('sets a bounded attempt count and exponential backoff from the environment', () => {
    expect(
      meetingProcessingJobOptions({
        WORKER_JOB_ATTEMPTS: 5,
        WORKER_JOB_BACKOFF_MS: 1_000,
      }),
    ).toEqual({
      attempts: 5,
      backoff: { type: 'exponential', delay: 1_000 },
      removeOnComplete: completedJobRetention,
      removeOnFail: failedJobRetention,
    });
  });
});
