import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { ENV, type Env } from '../config/config.module.js';
import { loadWorkerRuntime } from '../config/env.schema.js';
import {
  jobPayloadSchema,
  type JobPayload,
} from '../queue/job-payload.schema.js';
import { MEETING_PROCESSING_QUEUE_NAME } from '../queue/queue-names.js';
import { ApplicationError } from '../shared/errors/application-error.js';
import { withTimeout } from '../shared/with-timeout.js';
import { ProcessingService } from './processing.service.js';

export interface ProcessingWorkerOptions {
  concurrency: number;
  lockDuration: number;
  stalledInterval: number;
  maxStalledCount: number;
}

export function processingWorkerOptions(
  source: Record<string, string | undefined>,
): ProcessingWorkerOptions {
  const runtime = loadWorkerRuntime(source);
  return {
    concurrency: runtime.WORKER_CONCURRENCY,
    lockDuration: runtime.WORKER_LOCK_DURATION_MS,
    stalledInterval: runtime.WORKER_STALLED_INTERVAL_MS,
    maxStalledCount: 1,
  };
}

@Processor(
  MEETING_PROCESSING_QUEUE_NAME,
  processingWorkerOptions(process.env),
)
export class ProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(ProcessingProcessor.name);

  constructor(
    private readonly processing: ProcessingService,
    @Inject(ENV) private readonly env: Env,
  ) {
    super();
  }

  process(job: Job<JobPayload>): Promise<void> {
    // A timed-out attempt keeps running. Stored results are unique, so a late write does not add a second copy.
    return withTimeout(
      this.processing.runStep(job.data),
      this.env.WORKER_STEP_TIMEOUT_MS,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error): void {
    this.logger.error(processingFailureMessage(job, error));
  }
}

export function processingFailureMessage(
  job: Job | undefined,
  error: Error,
): string {
  const parsed = jobPayloadSchema.safeParse(job?.data);
  const meetingId = parsed.success ? parsed.data.meetingId : 'unknown';
  const step = parsed.success ? parsed.data.step : 'unknown';
  const attempt = job?.attemptsMade ?? 0;
  const code = error instanceof ApplicationError ? error.code : error.name;

  return `Processing job failed meetingId=${meetingId} step=${step} attempt=${attempt} error=${code}`;
}
