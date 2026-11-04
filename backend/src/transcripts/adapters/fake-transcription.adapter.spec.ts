import { localSeed } from '../../database/local-seed.js';
import { transcriptionResultSchema } from './transcription.adapter.js';
import { FakeTranscriptionAdapter } from './fake-transcription.adapter.js';

const recordingExternalId = `fake-recording:${localSeed.meetingId}`;
const otherMeetingId = '66666666-6666-4666-8666-666666666666';

describe('FakeTranscriptionAdapter', () => {
  const adapter = new FakeTranscriptionAdapter();

  it('returns the same ten segments on every call', async () => {
    const first = await adapter.transcribe({
      meetingId: localSeed.meetingId,
      recordingExternalId,
    });
    const second = await adapter.transcribe({
      meetingId: otherMeetingId,
      recordingExternalId: `fake-recording:${otherMeetingId}`,
    });

    expect(second).toEqual(first);
    expect(transcriptionResultSchema.parse(first).segments).toHaveLength(10);
  });

  it('uses three meeting-local speaker labels and increasing times', async () => {
    const { segments } = await adapter.transcribe({
      meetingId: localSeed.meetingId,
      recordingExternalId,
    });

    expect(segments.map((segment) => segment.speakerId)).toEqual([
      'speaker_1',
      'speaker_2',
      'speaker_3',
      'speaker_1',
      'speaker_2',
      'speaker_3',
      'speaker_1',
      'speaker_2',
      'speaker_3',
      'speaker_1',
    ]);
    expect(
      segments.every(
        (segment, index) =>
          segment.endMs >= segment.startMs &&
          (index === 0 || segment.startMs >= segments[index - 1].startMs),
      ),
    ).toBe(true);
  });

  it('returns no media and no names or email addresses', async () => {
    const result = await adapter.transcribe({
      meetingId: localSeed.meetingId,
      recordingExternalId,
    });

    expect(Object.keys(result)).toEqual(['segments']);
    expect(
      result.segments.map((segment) => Object.keys(segment).sort()),
    ).toEqual(
      Array.from({ length: 10 }, () => [
        'endMs',
        'speakerId',
        'startMs',
        'text',
      ]),
    );

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
