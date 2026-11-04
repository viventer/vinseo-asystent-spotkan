import { localSeed } from '../../database/local-seed.js';
import { transcriptionResultSchema } from './transcription.adapter.js';
import { FakeTranscriptionAdapter } from './fake-transcription.adapter.js';

const recordingExternalId = `fake-recording:${localSeed.meetingId}`;
const otherMeetingId = '66666666-6666-4666-8666-666666666666';

describe('FakeTranscriptionAdapter', () => {
  const adapter = new FakeTranscriptionAdapter();

  it('returns the same transcript on every call', async () => {
    const first = await adapter.transcribe({
      meetingId: localSeed.meetingId,
      recordingExternalId,
    });
    const second = await adapter.transcribe({
      meetingId: otherMeetingId,
      recordingExternalId: `fake-recording:${otherMeetingId}`,
    });

    expect(second).toEqual(first);
    expect(transcriptionResultSchema.parse(first)).toEqual(first);
  });

  it('returns a meeting of realistic length from the fixture file', async () => {
    const { segments } = await adapter.transcribe({
      meetingId: localSeed.meetingId,
      recordingExternalId,
    });
    const lastEndMs = segments[segments.length - 1]?.endMs ?? 0;

    expect(segments.length).toBeGreaterThanOrEqual(150);
    expect(lastEndMs).toBeGreaterThanOrEqual(15 * 60_000);
  });

  it('uses three meeting-local speaker labels and ordered, non-overlapping times', async () => {
    const { segments } = await adapter.transcribe({
      meetingId: localSeed.meetingId,
      recordingExternalId,
    });

    expect(
      [...new Set(segments.map((segment) => segment.speakerId))].sort(),
    ).toEqual(['speaker_1', 'speaker_2', 'speaker_3']);
    expect(
      segments.every(
        (segment, index) =>
          segment.endMs >= segment.startMs &&
          (index === 0 || segment.startMs >= segments[index - 1].endMs),
      ),
    ).toBe(true);
  });

  it('returns a fresh copy so a caller cannot change the next result', async () => {
    const request = { meetingId: localSeed.meetingId, recordingExternalId };
    const first = await adapter.transcribe(request);
    first.segments[0].text = 'changed';

    const second = await adapter.transcribe(request);

    expect(second.segments[0].text).not.toBe('changed');
  });

  it('returns no media and no names or email addresses', async () => {
    const result = await adapter.transcribe({
      meetingId: localSeed.meetingId,
      recordingExternalId,
    });

    expect(Object.keys(result)).toEqual(['segments']);
    expect(
      result.segments.every(
        (segment) =>
          Object.keys(segment).sort().join() === 'endMs,speakerId,startMs,text',
      ),
    ).toBe(true);

    const text = result.segments.map((segment) => segment.text).join('\n');
    expect(text).not.toMatch(/@/);
    expect(text).not.toMatch(/example\.com/i);
    for (const user of [
      localSeed.organizer,
      ...localSeed.employees,
      localSeed.client,
    ]) {
      expect(text).not.toContain(user.displayName);
      expect(text).not.toContain(user.email);
    }
  });
});
