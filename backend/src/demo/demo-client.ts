import { z } from 'zod';
import {
  summaryResponseSchema,
  type SummaryResponse,
} from '../summaries/dto/summary-response.dto.js';
import {
  tasksResponseSchema,
  type TasksResponse,
} from '../summaries/dto/tasks-response.dto.js';
import {
  transcriptResponseSchema,
  type TranscriptResponse,
} from '../transcripts/dto/transcript-response.dto.js';

export const demoPollIntervalMs = 250;

const readPaths = ['transcript', 'summary', 'tasks'] as const;

const errorBodySchema = z.object({
  error: z.string(),
});

export interface DemoResults {
  transcript: TranscriptResponse;
  summary: SummaryResponse;
  tasks: TasksResponse;
}

export interface DemoClientOptions {
  baseUrl: string;
  meetingId: string;
  callerUserId: string;
  timeoutMs: number;
  pollIntervalMs: number;
  fetchImpl: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
}

export class DemoRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'DemoRequestError';
    this.status = status;
  }
}

export class DemoTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Example meeting results were not published within ${timeoutMs}ms`);
    this.name = 'DemoTimeoutError';
  }
}

export async function collectExampleMeeting(
  options: DemoClientOptions,
): Promise<DemoResults> {
  const deadline = options.now() + options.timeoutMs;
  await startProcessing(options, deadline);

  while (options.now() < deadline) {
    const published = await readPublished(options, deadline);
    if (published) {
      return published;
    }
    const pause = Math.min(options.pollIntervalMs, deadline - options.now());
    if (pause <= 0) {
      break;
    }
    await options.sleep(pause);
  }

  throw new DemoTimeoutError(options.timeoutMs);
}

async function startProcessing(
  options: DemoClientOptions,
  deadline: number,
): Promise<void> {
  const response = await request(options, deadline, 'POST', 'processing');
  const text = await response.text();
  if (response.status !== 202 || text !== '') {
    throw new DemoRequestError(
      `Processing was not accepted: ${response.status} ${errorCode(text)}`,
      response.status,
    );
  }
}

async function readPublished(
  options: DemoClientOptions,
  deadline: number,
): Promise<DemoResults | undefined> {
  const reads = await Promise.all(
    readPaths.map(async (path) => {
      const response = await request(options, deadline, 'GET', path, {
        'X-User-Id': options.callerUserId,
      });
      return { path, status: response.status, text: await response.text() };
    }),
  );

  const failed = reads.find(
    (read) => read.status !== 200 && read.status !== 404,
  );
  if (failed) {
    throw new DemoRequestError(
      `Read failed for ${failed.path}: ${failed.status} ${errorCode(failed.text)}`,
      failed.status,
    );
  }
  if (reads.some((read) => read.status === 404)) {
    return undefined;
  }

  const [transcript, summary, tasks] = reads;
  if (!transcript || !summary || !tasks) {
    throw new DemoRequestError('The API returned an incomplete result', 200);
  }

  return {
    transcript: parseResult(transcriptResponseSchema, transcript.text),
    summary: parseResult(summaryResponseSchema, summary.text),
    tasks: parseResult(tasksResponseSchema, tasks.text),
  };
}

async function request(
  options: DemoClientOptions,
  deadline: number,
  method: 'GET' | 'POST',
  path: string,
  headers?: Record<string, string>,
): Promise<Response> {
  const remaining = deadline - options.now();
  if (remaining <= 0) {
    throw new DemoTimeoutError(options.timeoutMs);
  }

  const baseUrl = options.baseUrl.replace(/\/+$/u, '');
  const meetingId = encodeURIComponent(options.meetingId);
  try {
    return await options.fetchImpl(`${baseUrl}/meetings/${meetingId}/${path}`, {
      method,
      headers,
      signal: AbortSignal.timeout(remaining),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new DemoTimeoutError(options.timeoutMs);
    }
    throw error;
  }
}

function parseResult<T>(schema: z.ZodType<T>, text: string): T {
  let body: unknown;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    throw new DemoRequestError(
      'The API returned a result that does not match the response schema',
      200,
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new DemoRequestError(
      'The API returned a result that does not match the response schema',
      200,
    );
  }
  return parsed.data;
}

function errorCode(text: string): string {
  try {
    const parsed = errorBodySchema.safeParse(JSON.parse(text) as unknown);
    return parsed.success ? parsed.data.error : 'unexpected_response';
  } catch {
    return 'unexpected_response';
  }
}
