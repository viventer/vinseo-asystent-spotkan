import type { JobsOptions, KeepJobs } from 'bullmq';

const daySeconds = 24 * 60 * 60;

export const completedJobRetention = {
  age: daySeconds,
  count: 1_000,
} as const satisfies KeepJobs;

export const failedJobRetention = {
  age: 7 * daySeconds,
  count: 1_000,
} as const satisfies KeepJobs;

export function meetingProcessingJobOptions(env: {
  WORKER_JOB_ATTEMPTS: number;
  WORKER_JOB_BACKOFF_MS: number;
}): JobsOptions {
  return {
    attempts: env.WORKER_JOB_ATTEMPTS,
    backoff: {
      type: 'exponential',
      delay: env.WORKER_JOB_BACKOFF_MS,
    },
    removeOnComplete: completedJobRetention,
    removeOnFail: failedJobRetention,
  };
}
