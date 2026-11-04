import type { SummaryResponse } from '../summaries/dto/summary-response.dto.js';
import type { TasksResponse } from '../summaries/dto/tasks-response.dto.js';
import type { TranscriptResponse } from '../transcripts/dto/transcript-response.dto.js';
import {
  renderDecisions,
  renderSummary,
  renderTasks,
  renderTranscript,
} from './markdown-export.js';

const transcript: TranscriptResponse = {
  segments: [
    {
      speaker: { speakerId: 'speaker_1', displayName: null },
      startMs: 0,
      endMs: 4200,
      text: 'Zaczynamy przegląd statusu wdrożenia.',
    },
    {
      speaker: { speakerId: 'speaker_2', displayName: null },
      startMs: 4200,
      endMs: 9100,
      text: 'Integracja z magazynem jest gotowa do testów.',
    },
  ],
};

const summary: SummaryResponse = {
  summary: 'Ustalono termin testów i odbiór po ich zakończeniu.',
  decisions: [
    {
      text: 'Odbiór nastąpi po zakończeniu testów.',
      speakers: [
        { speakerId: 'speaker_1', displayName: null },
        { speakerId: 'speaker_2', displayName: null },
      ],
    },
    {
      text: 'Nie wskazano mówcy.',
      speakers: [],
    },
  ],
};

const tasks: TasksResponse = {
  tasks: [
    {
      speaker: { speakerId: 'speaker_3', displayName: null },
      action: 'Dokończyć listę uwag.',
      deadline: '2026-11-13',
    },
  ],
};

describe('example meeting markdown', () => {
  it('renders the transcript with speaker ids and segment times', () => {
    expect(renderTranscript(transcript)).toBe(
      [
        '# Transcript',
        '',
        '1. speaker_1 (0-4200 ms)',
        '',
        'Zaczynamy przegląd statusu wdrożenia.',
        '',
        '2. speaker_2 (4200-9100 ms)',
        '',
        'Integracja z magazynem jest gotowa do testów.',
        '',
      ].join('\n'),
    );
  });

  it('renders the summary text', () => {
    expect(renderSummary(summary)).toBe(
      ['# Summary', '', summary.summary, ''].join('\n'),
    );
  });

  it('renders decisions and leaves a decision without speakers unlabeled', () => {
    expect(renderDecisions(summary)).toBe(
      [
        '# Decisions',
        '',
        '1. Odbiór nastąpi po zakończeniu testów.',
        '',
        'Speakers: speaker_1, speaker_2',
        '',
        '2. Nie wskazano mówcy.',
        '',
      ].join('\n'),
    );
  });

  it('renders an empty decision list', () => {
    expect(renderDecisions({ summary: summary.summary, decisions: [] })).toBe(
      ['# Decisions', '', 'No decisions.', ''].join('\n'),
    );
  });

  it('renders tasks with speaker ids and deadlines', () => {
    expect(renderTasks(tasks)).toBe(
      [
        '# Tasks',
        '',
        '1. speaker_3: Dokończyć listę uwag.',
        '',
        'Deadline: 2026-11-13',
        '',
      ].join('\n'),
    );
  });

  it('renders an empty task list', () => {
    expect(renderTasks({ tasks: [] })).toBe(
      ['# Tasks', '', 'No tasks.', ''].join('\n'),
    );
  });

  it('does not print a display name or an email address', () => {
    const rendered = [
      renderTranscript(transcript),
      renderSummary(summary),
      renderDecisions(summary),
      renderTasks(tasks),
    ].join('\n');

    expect(rendered).not.toContain('displayName');
    expect(rendered).not.toContain('@');
    expect(rendered).not.toContain('null');
  });
});
