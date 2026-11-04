import { localSeed } from '../../database/local-seed.js';
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

  it('uses local speaker ids and a fixed deadline', async () => {
    const result = summaryResultSchema.parse(await adapter.summarize(payload));
    const speakerIds = [
      ...result.decisions.flatMap((decision) => decision.speakerIds),
      ...result.tasks.map((task) => task.speakerId),
    ];

    expect(result.decisions.length).toBeGreaterThan(0);
    expect(result.tasks.length).toBeGreaterThan(0);
    expect(
      speakerIds.every((speakerId) => /^speaker_[123]$/.test(speakerId)),
    ).toBe(true);
    expect(result.tasks.map((task) => task.deadline)).toEqual([
      '2026-11-13',
      '2026-11-13',
    ]);
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
