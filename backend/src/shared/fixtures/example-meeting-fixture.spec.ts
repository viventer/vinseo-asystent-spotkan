import { readExampleMeetingFixture } from './example-meeting-fixture.js';

describe('readExampleMeetingFixture', () => {
  it('reads the transcript and the summary parts of the fixture file', () => {
    const fixture = readExampleMeetingFixture();

    expect(fixture.transcript).toEqual(
      expect.objectContaining({ segments: expect.any(Array) }),
    );
    expect(fixture.summary).toEqual(
      expect.objectContaining({
        summary: expect.any(String),
        decisions: expect.any(Array),
        tasks: expect.any(Array),
      }),
    );
  });

  it('returns an independent copy on every call', () => {
    const first = readExampleMeetingFixture();
    (first.transcript as { segments: unknown[] }).segments.length = 0;

    const second = readExampleMeetingFixture();

    expect(
      (second.transcript as { segments: unknown[] }).segments.length,
    ).toBeGreaterThan(0);
  });
});
