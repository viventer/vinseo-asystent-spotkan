import type { SummaryResponse } from '../summaries/dto/summary-response.dto.js';
import type { TasksResponse } from '../summaries/dto/tasks-response.dto.js';
import type { TranscriptResponse } from '../transcripts/dto/transcript-response.dto.js';

export function renderTranscript(transcript: TranscriptResponse): string {
  const body = transcript.segments
    .map((segment, index) =>
      [
        `${index + 1}. ${segment.speaker.speakerId} (${segment.startMs}-${segment.endMs} ms)`,
        '',
        segment.text,
      ].join('\n'),
    )
    .join('\n\n');
  return renderDocument('# Transcript', body);
}

export function renderSummary(summary: SummaryResponse): string {
  return renderDocument('# Summary', summary.summary);
}

export function renderDecisions(summary: SummaryResponse): string {
  if (summary.decisions.length === 0) {
    return renderDocument('# Decisions', 'No decisions.');
  }

  const body = summary.decisions
    .map((decision, index) => {
      const speakers = decision.speakers.map((speaker) => speaker.speakerId);
      const lines = [`${index + 1}. ${decision.text}`];
      if (speakers.length > 0) {
        lines.push('', `Speakers: ${speakers.join(', ')}`);
      }
      return lines.join('\n');
    })
    .join('\n\n');
  return renderDocument('# Decisions', body);
}

export function renderTasks(tasks: TasksResponse): string {
  if (tasks.tasks.length === 0) {
    return renderDocument('# Tasks', 'No tasks.');
  }

  const body = tasks.tasks
    .map((task, index) =>
      [
        `${index + 1}. ${task.speaker.speakerId}: ${task.action}`,
        '',
        `Deadline: ${task.deadline}`,
      ].join('\n'),
    )
    .join('\n\n');
  return renderDocument('# Tasks', body);
}

function renderDocument(title: string, body: string): string {
  return `${title}\n\n${body}\n`;
}
