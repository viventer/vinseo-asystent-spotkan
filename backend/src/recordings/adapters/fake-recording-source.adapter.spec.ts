import { localSeed } from '../../database/local-seed.js';
import { FakeRecordingSourceAdapter } from './fake-recording-source.adapter.js';

const otherMeetingId = '66666666-6666-4666-8666-666666666666';

describe('FakeRecordingSourceAdapter', () => {
  const adapter = new FakeRecordingSourceAdapter();

  it('returns the same ready marker for the same meeting', async () => {
    const first = await adapter.getReadyRecording(localSeed.meetingId);
    const second = await adapter.getReadyRecording(localSeed.meetingId);

    expect(second).toEqual(first);
    expect(first).toEqual({
      externalId: `fake-recording:${localSeed.meetingId}`,
      ready: true,
    });
  });

  it('returns a different identifier for another meeting', async () => {
    await expect(adapter.getReadyRecording(otherMeetingId)).resolves.toEqual({
      externalId: `fake-recording:${otherMeetingId}`,
      ready: true,
    });
  });

  it('returns no file, path, URL, or audio', async () => {
    const ready = await adapter.getReadyRecording(localSeed.meetingId);

    expect(Object.keys(ready).sort()).toEqual(['externalId', 'ready']);
  });
});
