import { jobPayloadSchema } from './job-payload.schema.js';

const meetingId = '550e8400-e29b-41d4-a716-446655440000';

describe('jobPayloadSchema', () => {
  it('accepts a meeting id and a known step', () => {
    expect(
      jobPayloadSchema.parse({
        meetingId,
        step: 'recording-ready',
      }),
    ).toEqual({
      meetingId,
      step: 'recording-ready',
    });
  });

  it.each(['recording-ready', 'transcribe', 'summarize-and-publish'] as const)(
    'accepts the %s step',
    (step) => {
      expect(jobPayloadSchema.parse({ meetingId, step }).step).toBe(step);
    },
  );

  it('rejects a meeting id that is not a uuid', () => {
    expect(
      jobPayloadSchema.safeParse({
        meetingId: 'meeting-1',
        step: 'recording-ready',
      }).success,
    ).toBe(false);
  });

  it('rejects an unknown step', () => {
    expect(
      jobPayloadSchema.safeParse({
        meetingId,
        step: 'publish',
      }).success,
    ).toBe(false);
  });

  it('rejects a payload that carries more than the meeting id and the step', () => {
    expect(
      jobPayloadSchema.safeParse({
        meetingId,
        step: 'transcribe',
        transcript: 'spoken words',
      }).success,
    ).toBe(false);
  });
});
