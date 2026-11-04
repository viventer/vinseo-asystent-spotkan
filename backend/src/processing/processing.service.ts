import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { MeetingsService } from '../meetings/meetings.service.js';
import { EnqueueService } from '../queue/enqueue.service.js';
import {
  jobPayloadSchema,
  type JobPayload,
  type ProcessingStep,
} from '../queue/job-payload.schema.js';
import { RecordingsService } from '../recordings/recordings.service.js';
import { ApplicationError } from '../shared/errors/application-error.js';
import { SummariesService } from '../summaries/summaries.service.js';
import { TranscriptsService } from '../transcripts/transcripts.service.js';

const nextStep = {
  'recording-ready': 'transcribe',
  transcribe: 'summarize-and-publish',
} as const satisfies Partial<Record<ProcessingStep, ProcessingStep>>;

@Injectable()
export class ProcessingService {
  constructor(
    private readonly meetings: MeetingsService,
    private readonly recordings: RecordingsService,
    private readonly transcripts: TranscriptsService,
    private readonly summaries: SummariesService,
    private readonly enqueueService: EnqueueService,
  ) {}

  async start(meetingId: string): Promise<void> {
    const parsed = z.uuid().safeParse(meetingId);
    if (!parsed.success) {
      throw new ApplicationError('invalid_request');
    }

    await this.meetings.assertMeetingExists(parsed.data);
    await this.enqueueService.enqueue({
      meetingId: parsed.data,
      step: 'recording-ready',
    });
  }

  async runStep(payload: unknown): Promise<void> {
    const parsed = jobPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      throw new ApplicationError('invalid_request');
    }

    await this.runParsedStep(parsed.data);
  }

  private async runParsedStep(payload: JobPayload): Promise<void> {
    switch (payload.step) {
      case 'recording-ready':
        await this.recordings.ensureRecordingReady(payload.meetingId);
        await this.enqueueNext(payload.meetingId, payload.step);
        return;
      case 'transcribe':
        await this.transcribe(payload.meetingId);
        await this.enqueueNext(payload.meetingId, payload.step);
        return;
      case 'summarize-and-publish':
        await this.summaries.ensureSummaryPublished({
          meetingId: payload.meetingId,
        });
        return;
      default:
        return assertNever(payload.step);
    }
  }

  private async transcribe(meetingId: string): Promise<void> {
    const recording = await this.recordings.ensureRecordingReady(meetingId);
    await this.transcripts.ensureTranscriptStored({
      meetingId,
      recordingExternalId: recording.externalId,
    });
  }

  private async enqueueNext(
    meetingId: string,
    step: keyof typeof nextStep,
  ): Promise<void> {
    await this.enqueueService.enqueue({
      meetingId,
      step: nextStep[step],
    });
  }
}

function assertNever(step: never): never {
  return step;
}
