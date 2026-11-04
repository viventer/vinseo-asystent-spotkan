import { localSeed } from '../../database/local-seed.js';
import { FakeTranscriptionAdapter } from '../../transcripts/adapters/fake-transcription.adapter.js';
import { buildSummaryPayload } from '../summary-payload.js';
import { FakeSummaryAdapter } from './fake-summary.adapter.js';
import { summaryResultSchema } from './summary.adapter.js';

const payload = buildSummaryPayload([
  {
    speakerId: 'speaker_1',
    startMs: 0,
    endMs: 1_000,
    text: 'Zaczynamy.',
  },
]);
const otherPayload = buildSummaryPayload([
  {
    speakerId: 'speaker_2',
    startMs: 0,
    endMs: 1_000,
    text: 'Inne spotkanie.',
  },
]);

describe('FakeSummaryAdapter', () => {
  const adapter = new FakeSummaryAdapter();

  it('returns the same summary, decisions, and tasks on every call', async () => {
    const first = await adapter.summarize(payload);
    const second = await adapter.summarize(otherPayload);

    expect(second).toEqual(first);
    expect(summaryResultSchema.parse(first)).toEqual(first);
  });

  it('returns a summary, decisions, and tasks sized for a long meeting', async () => {
    const result = summaryResultSchema.parse(await adapter.summarize(payload));

    expect(result.summary.length).toBeGreaterThanOrEqual(1_500);
    expect(result.decisions.length).toBeGreaterThanOrEqual(8);
    expect(result.tasks.length).toBeGreaterThanOrEqual(12);
  });

  it('refers only to speakers of the fixture transcript and uses real dates', async () => {
    const { segments } = await new FakeTranscriptionAdapter().transcribe({
      meetingId: localSeed.meetingId,
      recordingExternalId: `fake-recording:${localSeed.meetingId}`,
    });
    const transcriptSpeakers = new Set(
      segments.map((segment) => segment.speakerId),
    );
    const result = summaryResultSchema.parse(await adapter.summarize(payload));
    const speakerIds = [
      ...result.decisions.flatMap((decision) => decision.speakerIds),
      ...result.tasks.map((task) => task.speakerId),
    ];

    expect(
      speakerIds.every((speakerId) => transcriptSpeakers.has(speakerId)),
    ).toBe(true);
    expect(
      result.tasks.every(
        (task) =>
          !Number.isNaN(Date.parse(task.deadline)) &&
          task.deadline >= '2026-11-04',
      ),
    ).toBe(true);
  });

  it('returns a fresh copy so a caller cannot change the next result', async () => {
    const first = summaryResultSchema.parse(await adapter.summarize(payload));
    first.tasks.length = 0;

    const second = summaryResultSchema.parse(await adapter.summarize(payload));

    expect(second.tasks.length).toBeGreaterThan(0);
  });

  it('returns no names, email addresses, or person mapping', async () => {
    const result = await adapter.summarize(payload);

    expect(Object.keys(result).sort()).toEqual([
      'decisions',
      'summary',
      'tasks',
    ]);
    expect(JSON.stringify(result)).not.toMatch(/@/);
    for (const user of [
      localSeed.organizer,
      ...localSeed.employees,
      localSeed.client,
    ]) {
      expect(JSON.stringify(result)).not.toContain(user.displayName);
      expect(JSON.stringify(result)).not.toContain(user.email);
    }
  });
});
