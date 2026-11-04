import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

const fixtureFileSchema = z.strictObject({
  transcript: z.unknown(),
  summary: z.unknown(),
});

export interface ExampleMeetingFixture {
  transcript: unknown;
  summary: unknown;
}

let cached: ExampleMeetingFixture | undefined;

// The file is the single source for both fake adapters. Each adapter validates
// its own part with the schema of its port, so this module stays free of
// transcript and summary rules.
export function readExampleMeetingFixture(): ExampleMeetingFixture {
  if (cached === undefined) {
    const path = join(
      import.meta.dirname,
      '../../../fixtures/example-meeting.json',
    );
    const parsed = fixtureFileSchema.parse(
      JSON.parse(readFileSync(path, 'utf8')) as unknown,
    );
    cached = { transcript: parsed.transcript, summary: parsed.summary };
  }
  return structuredClone(cached);
}
