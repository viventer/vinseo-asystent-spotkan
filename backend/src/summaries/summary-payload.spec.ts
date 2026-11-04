import { ApplicationError } from '../shared/errors/application-error.js';
import {
  buildSummaryPayload,
  summaryPayloadSchema,
} from './summary-payload.js';

const segments = [
  {
    speakerId: 'speaker_2',
    startMs: 0,
    endMs: 1_000,
    text: 'Napisz na jan@example.com po spotkaniu.',
  },
  {
    speakerId: 'speaker_1',
    startMs: 1_000,
    endMs: 2_000,
    text: 'Dobrze.',
  },
  {
    speakerId: 'speaker_2',
    startMs: 2_000,
    endMs: 3_000,
    text: 'Zamykam.',
  },
];

describe('summary payload filter', () => {
  it('keeps segments, local speaker ids, and unknown roles', () => {
    const payload = buildSummaryPayload(segments);

    expect(payload).toEqual({
      segments: segments.map((segment) => ({ ...segment })),
      speakers: [
        { speakerId: 'speaker_2', role: 'unknown' },
        { speakerId: 'speaker_1', role: 'unknown' },
      ],
    });
    expect(summaryPayloadSchema.safeParse(payload).success).toBe(true);
  });

  it('leaves a name or email inside spoken text unchanged', () => {
    const payload = buildSummaryPayload(segments);

    expect(payload.segments[0]?.text).toContain('jan@example.com');
  });

  it.each([
    ['email', { email: 'ada@example.com' }],
    ['name', { name: 'Ada' }],
    ['user id', { userId: '22222222-2222-4222-8222-222222222222' }],
    ['person mapping', { mapping: { speaker_1: 'Ada' } }],
  ])('rejects a payload that adds a %s', (_label, extra) => {
    const payload = buildSummaryPayload(segments);

    expect(
      summaryPayloadSchema.safeParse({ ...payload, ...extra }).success,
    ).toBe(false);
  });

  it.each([
    ['display name', { displayName: 'Ada' }],
    ['email address', { email: 'ada@example.com' }],
  ])('rejects a segment that adds a %s', (_label, extra) => {
    const payload = buildSummaryPayload(segments);
    const [first, ...rest] = payload.segments;

    expect(
      summaryPayloadSchema.safeParse({
        ...payload,
        segments: [{ ...first, ...extra }, ...rest],
      }).success,
    ).toBe(false);
  });

  it.each([
    ['Ada', 'Ada'],
    ['email address', 'ada@example.com'],
    ['blank id', '   '],
  ])('rejects a %s used as a speaker id', (_label, speakerId) => {
    expect(() =>
      buildSummaryPayload([
        { speakerId, startMs: 0, endMs: 1_000, text: 'Cześć.' },
      ]),
    ).toThrow(ApplicationError);
  });

  it('rejects a role other than unknown', () => {
    const payload = buildSummaryPayload(segments);

    expect(
      summaryPayloadSchema.safeParse({
        ...payload,
        speakers: [{ speakerId: 'speaker_1', role: 'employee' }],
      }).success,
    ).toBe(false);
  });

  it('rejects a speaker that does not appear in the segments', () => {
    const payload = buildSummaryPayload(segments);

    expect(
      summaryPayloadSchema.safeParse({
        ...payload,
        speakers: [
          ...payload.speakers,
          { speakerId: 'speaker_9', role: 'unknown' },
        ],
      }).success,
    ).toBe(false);
  });
});
