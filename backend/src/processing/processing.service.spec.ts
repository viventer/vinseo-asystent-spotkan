import { localSeed } from '../database/local-seed.js';
import { EnqueueService } from '../queue/enqueue.service.js';
import { MeetingsService } from '../meetings/meetings.service.js';
import type { RecordingRecord } from '../recordings/recordings.repository.js';
import { RecordingsService } from '../recordings/recordings.service.js';
import { ApplicationError } from '../shared/errors/application-error.js';
import { InvalidSummaryResultError } from '../shared/errors/invalid-summary-result.error.js';
import type { SummaryPublication } from '../summaries/summaries.repository.js';
import { SummariesService } from '../summaries/summaries.service.js';
import { TranscriptsService } from '../transcripts/transcripts.service.js';
import { ProcessingService } from './processing.service.js';

const meetingId = localSeed.meetingId;
const recording: RecordingRecord = {
  id: '88888888-8888-4888-8888-888888888888',
  meetingId,
  externalId: `fake-recording:${meetingId}`,
};
const publication: SummaryPublication = {
  summary: {
    id: '77777777-7777-4777-8777-777777777777',
    meetingId,
    text: 'Ustalono termin testów.',
  },
  decisions: [],
  tasks: [],
};

function createService() {
  const assertMeetingExists = vi
    .fn<MeetingsService['assertMeetingExists']>()
    .mockResolvedValue(undefined);
  const ensureRecordingReady = vi
    .fn<RecordingsService['ensureRecordingReady']>()
    .mockResolvedValue(recording);
  const ensureTranscriptStored = vi
    .fn<TranscriptsService['ensureTranscriptStored']>()
    .mockResolvedValue([]);
  const ensureSummaryPublished = vi
    .fn<SummariesService['ensureSummaryPublished']>()
    .mockResolvedValue(publication);
  const enqueue = vi
    .fn<EnqueueService['enqueue']>()
    .mockResolvedValue(undefined);
  const service = new ProcessingService(
    { assertMeetingExists } as unknown as MeetingsService,
    { ensureRecordingReady } as unknown as RecordingsService,
    { ensureTranscriptStored } as unknown as TranscriptsService,
    { ensureSummaryPublished } as unknown as SummariesService,
    { enqueue } as unknown as EnqueueService,
  );

  return {
    service,
    assertMeetingExists,
    ensureRecordingReady,
    ensureTranscriptStored,
    ensureSummaryPublished,
    enqueue,
  };
}

describe('ProcessingService', () => {
  describe('start', () => {
    it('enqueues recording-ready after the meeting is found', async () => {
      const { service, assertMeetingExists, enqueue } = createService();

      await service.start(meetingId);

      expect(assertMeetingExists).toHaveBeenCalledWith(meetingId);
      expect(enqueue).toHaveBeenCalledExactlyOnceWith({
        meetingId,
        step: 'recording-ready',
      });
      expect(assertMeetingExists.mock.invocationCallOrder[0]).toBeLessThan(
        enqueue.mock.invocationCallOrder[0] ?? 0,
      );
    });

    it('does not enqueue when the meeting does not exist', async () => {
      const { service, assertMeetingExists, enqueue } = createService();
      assertMeetingExists.mockRejectedValue(new ApplicationError('not_found'));

      await expect(service.start(meetingId)).rejects.toMatchObject({
        code: 'not_found',
        statusCode: 404,
      });
      expect(enqueue).not.toHaveBeenCalled();
    });

    it('rejects an id that is not a uuid before checking the meeting', async () => {
      const { service, assertMeetingExists, enqueue } = createService();

      await expect(service.start('meeting-1')).rejects.toMatchObject({
        code: 'invalid_request',
        statusCode: 400,
      });
      expect(assertMeetingExists).not.toHaveBeenCalled();
      expect(enqueue).not.toHaveBeenCalled();
    });
  });

  describe('runStep', () => {
    it('enqueues transcribe only after the recording-ready step finishes', async () => {
      const { service, ensureRecordingReady, enqueue } = createService();
      let finish: (value: RecordingRecord) => void = () => undefined;
      ensureRecordingReady.mockReturnValue(
        new Promise((resolve) => {
          finish = resolve;
        }),
      );

      const pending = service.runStep({ meetingId, step: 'recording-ready' });
      expect(enqueue).not.toHaveBeenCalled();

      finish(recording);
      await pending;

      expect(ensureRecordingReady).toHaveBeenCalledWith(meetingId);
      expect(enqueue).toHaveBeenCalledExactlyOnceWith({
        meetingId,
        step: 'transcribe',
      });
    });

    it('stores the transcript from the ready recording, then enqueues summary', async () => {
      const { service, ensureRecordingReady, ensureTranscriptStored, enqueue } =
        createService();

      await service.runStep({ meetingId, step: 'transcribe' });

      expect(ensureRecordingReady).toHaveBeenCalledWith(meetingId);
      expect(ensureTranscriptStored).toHaveBeenCalledWith({
        meetingId,
        recordingExternalId: recording.externalId,
      });
      expect(ensureTranscriptStored.mock.invocationCallOrder[0]).toBeLessThan(
        enqueue.mock.invocationCallOrder[0] ?? 0,
      );
      expect(enqueue).toHaveBeenCalledExactlyOnceWith({
        meetingId,
        step: 'summarize-and-publish',
      });
    });

    it('publishes the summary without enqueueing another step', async () => {
      const { service, ensureSummaryPublished, enqueue } = createService();

      await service.runStep({ meetingId, step: 'summarize-and-publish' });

      expect(ensureSummaryPublished).toHaveBeenCalledWith({ meetingId });
      expect(enqueue).not.toHaveBeenCalled();
    });

    it('does not enqueue the next step when the current step fails', async () => {
      const {
        service,
        ensureRecordingReady,
        ensureTranscriptStored,
        ensureSummaryPublished,
        enqueue,
      } = createService();
      ensureRecordingReady.mockRejectedValue(
        new ApplicationError('internal_error'),
      );

      await expect(
        service.runStep({ meetingId, step: 'transcribe' }),
      ).rejects.toMatchObject({ code: 'internal_error' });
      expect(ensureTranscriptStored).not.toHaveBeenCalled();
      expect(ensureSummaryPublished).not.toHaveBeenCalled();
      expect(enqueue).not.toHaveBeenCalled();
    });

    it('propagates an invalid summary and does not enqueue another step', async () => {
      const { service, ensureSummaryPublished, enqueue } = createService();
      ensureSummaryPublished.mockRejectedValue(new InvalidSummaryResultError());

      await expect(
        service.runStep({ meetingId, step: 'summarize-and-publish' }),
      ).rejects.toBeInstanceOf(InvalidSummaryResultError);
      expect(enqueue).not.toHaveBeenCalled();
    });

    it('calls the idempotent step again when the same job is delivered twice', async () => {
      const { service, ensureRecordingReady, enqueue } = createService();
      const payload = { meetingId, step: 'recording-ready' as const };

      await service.runStep(payload);
      await service.runStep(payload);

      expect(ensureRecordingReady).toHaveBeenCalledTimes(2);
      expect(ensureRecordingReady).toHaveBeenNthCalledWith(1, meetingId);
      expect(ensureRecordingReady).toHaveBeenNthCalledWith(2, meetingId);
      expect(enqueue).toHaveBeenCalledTimes(2);
      expect(enqueue).toHaveBeenNthCalledWith(1, {
        meetingId,
        step: 'transcribe',
      });
      expect(enqueue).toHaveBeenNthCalledWith(2, {
        meetingId,
        step: 'transcribe',
      });
    });

    it('rejects a payload that is not a meeting id and a step', async () => {
      const { service, ensureRecordingReady, enqueue } = createService();

      await expect(
        service.runStep({
          meetingId,
          step: 'recording-ready',
          text: 'spoken words',
        }),
      ).rejects.toMatchObject({ code: 'invalid_request', statusCode: 400 });
      await expect(
        service.runStep({ meetingId, step: 'publish' }),
      ).rejects.toMatchObject({ code: 'invalid_request' });
      expect(ensureRecordingReady).not.toHaveBeenCalled();
      expect(enqueue).not.toHaveBeenCalled();
    });
  });
});
