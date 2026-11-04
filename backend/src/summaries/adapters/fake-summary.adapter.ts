import { Injectable } from '@nestjs/common';
import { readExampleMeetingFixture } from '../../shared/fixtures/example-meeting-fixture.js';
import {
  summaryResultSchema,
  type SummaryAdapter,
  type SummaryResult,
} from './summary.adapter.js';

@Injectable()
export class FakeSummaryAdapter implements SummaryAdapter {
  summarize(_payload: unknown): Promise<SummaryResult> {
    return Promise.resolve(
      summaryResultSchema.parse(readExampleMeetingFixture().summary),
    );
  }
}
