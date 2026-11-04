import {
  collectExampleMeeting,
  DemoRequestError,
  DemoTimeoutError,
  type DemoClientOptions,
} from './demo-client.js';

const meetingId = '55555555-5555-4555-8555-555555555555';
const callerUserId = '22222222-2222-4222-8222-222222222222';

const transcriptBody = {
  segments: [
    {
      speaker: { speakerId: 'speaker_1', displayName: null },
      startMs: 0,
      endMs: 1000,
      text: 'Zaczynamy.',
    },
  ],
};

const summaryBody = {
  summary: 'Ustalono termin.',
  decisions: [
    {
      text: 'Odbiór po testach.',
      speakers: [{ speakerId: 'speaker_1', displayName: null }],
    },
  ],
};

const tasksBody = {
  tasks: [
    {
      speaker: { speakerId: 'speaker_2', displayName: null },
      action: 'Przygotować środowisko.',
      deadline: '2026-11-13',
    },
  ],
};

describe('collectExampleMeeting', () => {
  it('starts processing without a caller and reads as the participant', async () => {
    const requests: { url: string; method: string; userId: string | null }[] =
      [];
    const results = await collectExampleMeeting(
      options(async (input, init) => {
        const url = requestUrl(input);
        requests.push({
          url,
          method: init?.method ?? 'GET',
          userId: header(init, 'X-User-Id'),
        });
        return jsonResponse(url, 200);
      }),
    );

    expect(requests[0]).toEqual({
      url: `http://api:3000/meetings/${meetingId}/processing`,
      method: 'POST',
      userId: null,
    });
    expect(requests.slice(1).map((request) => request.userId)).toEqual([
      callerUserId,
      callerUserId,
      callerUserId,
    ]);
    expect(results).toEqual({
      transcript: transcriptBody,
      summary: summaryBody,
      tasks: tasksBody,
    });
  });

  it('strips a trailing slash and waits through not_found', async () => {
    let published = false;
    const sleep = vi.fn(async () => {
      published = true;
    });
    const results = await collectExampleMeeting({
      ...options(async (input) => {
        const url = requestUrl(input);
        if (url.endsWith('/processing')) {
          return new Response('', { status: 202 });
        }
        if (!published) {
          return Response.json({ error: 'not_found' }, { status: 404 });
        }
        return jsonResponse(url, 200);
      }),
      baseUrl: 'http://api:3000/',
      sleep,
    });

    expect(sleep).toHaveBeenCalledOnce();
    expect(results.transcript.segments).toHaveLength(1);
  });

  it('rejects a processing response that is not an empty 202', async () => {
    const secret = 'hidden transcript text';
    await expect(
      collectExampleMeeting(
        options(async () =>
          Response.json(
            { error: 'not_found', transcript: secret },
            { status: 404 },
          ),
        ),
      ),
    ).rejects.toThrow(DemoRequestError);

    await expect(
      collectExampleMeeting(
        options(async () =>
          Response.json(
            { error: 'not_found', transcript: secret },
            { status: 404 },
          ),
        ),
      ),
    ).rejects.toThrow('Processing was not accepted: 404 not_found');
  });

  it('rejects a read that is neither ready nor unpublished', async () => {
    await expect(
      collectExampleMeeting(
        options(async (input) => {
          const url = requestUrl(input);
          if (url.endsWith('/processing')) {
            return new Response('', { status: 202 });
          }
          return Response.json({ error: 'internal_error' }, { status: 500 });
        }),
      ),
    ).rejects.toThrow('Read failed for transcript: 500 internal_error');
  });

  it('rejects a result that does not match the response schema', async () => {
    const secret = 'Ada Example';
    await expect(
      collectExampleMeeting(
        options(async (input) => {
          const url = requestUrl(input);
          if (url.endsWith('/processing')) {
            return new Response('', { status: 202 });
          }
          if (url.endsWith('/transcript')) {
            return Response.json({
              segments: [
                {
                  speaker: { speakerId: 'speaker_1', displayName: secret },
                  startMs: 0,
                  endMs: 1,
                  text: 'Cześć',
                },
              ],
            });
          }
          return jsonResponse(url, 200);
        }),
      ),
    ).rejects.toThrow(
      'The API returned a result that does not match the response schema',
    );
  });

  it('stops when the results stay unpublished', async () => {
    let clock = 0;
    const sleep = vi.fn(async (ms: number) => {
      clock += ms;
    });

    await expect(
      collectExampleMeeting({
        ...options(async (input) => {
          const url = requestUrl(input);
          if (url.endsWith('/processing')) {
            return new Response('', { status: 202 });
          }
          return Response.json({ error: 'not_found' }, { status: 404 });
        }),
        timeoutMs: 500,
        pollIntervalMs: 250,
        sleep,
        now: () => clock,
      }),
    ).rejects.toBeInstanceOf(DemoTimeoutError);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('turns a timed-out request into a timeout error', async () => {
    const timeout = new Error('The operation was aborted due to timeout');
    timeout.name = 'TimeoutError';

    await expect(
      collectExampleMeeting(
        options(async () => {
          throw timeout;
        }),
      ),
    ).rejects.toBeInstanceOf(DemoTimeoutError);
  });
});

function requestUrl(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input.url;
}

function options(fetchImpl: typeof fetch): DemoClientOptions {
  return {
    baseUrl: 'http://api:3000',
    meetingId,
    callerUserId,
    timeoutMs: 5_000,
    pollIntervalMs: 250,
    fetchImpl,
    sleep: async () => undefined,
    now: () => 0,
  };
}

function header(init: RequestInit | undefined, name: string): string | null {
  const headers = init?.headers;
  if (
    headers === undefined ||
    headers instanceof Headers ||
    Array.isArray(headers)
  ) {
    return null;
  }
  return headers[name] ?? null;
}

function jsonResponse(url: string, status: number): Response {
  if (url.endsWith('/processing')) {
    return new Response('', { status: 202 });
  }
  if (url.endsWith('/transcript')) {
    return Response.json(transcriptBody, { status });
  }
  if (url.endsWith('/summary')) {
    return Response.json(summaryBody, { status });
  }
  return Response.json(tasksBody, { status });
}
