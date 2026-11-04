import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import {
  jobPayloadSchema,
  type JobPayload,
  type ProcessingStep,
} from './job-payload.schema.js';
import { MEETING_PROCESSING_QUEUE_NAME } from './queue-names.js';

@Injectable()
export class EnqueueService {
  private readonly logger = new Logger(EnqueueService.name);

  constructor(
    @InjectQueue(MEETING_PROCESSING_QUEUE_NAME)
    private readonly queue: Queue<JobPayload, void, ProcessingStep>,
  ) {
    this.queue.on('error', (error: Error) => {
      this.logger.error(
        `Meeting processing queue connection failed: ${connectionFailure(error)}`,
      );
    });
  }

  async enqueue(payload: unknown): Promise<void> {
    const parsed = jobPayloadSchema.parse(payload);
    await this.queue.add(parsed.step, parsed);
  }
}

function connectionFailure(error: Error): string {
  if (
    'code' in error &&
    typeof error.code === 'string' &&
    error.code.length > 0
  ) {
    return error.code;
  }

  const line = error.message.split('\n')[0] ?? error.name;
  return line.replace(/rediss?:\/\/\S+/gi, 'redis://***');
}
