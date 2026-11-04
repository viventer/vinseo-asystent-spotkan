import { Injectable } from '@nestjs/common';
import type { SummaryAdapter, SummaryResult } from './summary.adapter.js';

const sampleSummary = {
  summary: 'Ustalono termin testów i odbiór po ich zakończeniu.',
  decisions: [
    {
      text: 'Odbiór nastąpi po zakończeniu testów.',
      speakerIds: ['speaker_1', 'speaker_2'],
    },
  ],
  tasks: [
    {
      speakerId: 'speaker_3',
      action: 'Dokończyć listę uwag.',
      deadline: '2026-11-13',
    },
    {
      speakerId: 'speaker_2',
      action: 'Przygotować środowisko testowe.',
      deadline: '2026-11-13',
    },
  ],
} as const satisfies SummaryResult;

@Injectable()
export class FakeSummaryAdapter implements SummaryAdapter {
  summarize(_payload: unknown): Promise<SummaryResult> {
    return Promise.resolve({
      summary: sampleSummary.summary,
      decisions: sampleSummary.decisions.map((decision) => ({
        text: decision.text,
        speakerIds: [...decision.speakerIds],
      })),
      tasks: sampleSummary.tasks.map((task) => ({ ...task })),
    });
  }
}
