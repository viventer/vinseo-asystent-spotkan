# API

HTTP API for version zero. Behavior is defined in `docs/version-zero.md`. The participation rule is defined in `docs/authorization.md`. Request and response shapes are defined in `docs/data-model.md` and are not repeated here. OpenAPI describes the same contract for local use. Paths have no version prefix.

Version zero has no meeting list, search, assistant, notifications, or processing-status endpoint. Provider webhooks that report transcription progress are later work.

## Conventions

### Format

- JSON, UTF-8.
- Identifiers are uuids.
- Dates are `YYYY-MM-DD`.
- Segment times are milliseconds.
- Lists of segments, decisions, and tasks are ordered by `position`.

### Identity

A local stand-in sends the caller on every meeting read:

```http
X-User-Id: <uuid>
```

`MeetingReadRequest.callerUserId` is the same value inside the service. The header is the transport. A later Google login replaces the stand-in and leaves the participation check in place.

### Authorization

Every meeting read compares `X-User-Id` with `meeting_participants` for that meeting and denies by default. The meeting id is not permission to read. The organizer is refused unless they are also a participant.

`GET /health` and `POST /meetings/{meetingId}/processing` do not check participation. That is a version-zero assumption: both run only in the local environment, and the processing endpoint returns no meeting content. `docs/authorization.md` still requires a participant check for any endpoint that processes meeting data once Google login exists.

### Errors

Failures use `MeetingReadError`: `{ "error": "<code>" }`. A refusal never includes the transcript, the summary, or the tasks.

The service uses one `not_found` for a missing meeting, a caller who is not a participant, and a resource that has no row. The response does not say which of those happened, so a read does not reveal that a meeting exists.

| Status | `error` | When |
| --- | --- | --- |
| 200 | | A read succeeded. |
| 202 | | Processing was accepted. The body is empty. |
| 400 | `invalid_request` | A path id is not a uuid. |
| 401 | `unauthenticated` | `X-User-Id` is missing or is not a uuid. |
| 404 | `not_found` | The meeting does not exist, the caller is not a participant (including an unknown user id and an organizer who did not attend), or the caller is a participant and this resource has no row. |
| 500 | `internal_error` | An unexpected failure. |

On a meeting read the service checks the path uuid first, then the header, then participation and the resource. A malformed path id is `invalid_request` even when the header is also missing.

### Speakers

`Speaker.displayName` is `string | null` and is always present. Version zero always returns `null`. Speaker ids stay ids such as `speaker_1`.

## Endpoints

### `GET /health`

Reports that the API process is answering. It does not query PostgreSQL or Redis and does not require `X-User-Id`.

**Input.** None.

**Output.**

- 200: `HealthResponse`, with `status` set to `ok`.
- 500: `MeetingReadError` with `internal_error` if the handler itself fails. A process that is not running does not return JSON.

**Service logic.** The handler returns as soon as the process can serve the request. Dependency checks are outside this endpoint.

### `POST /meetings/{meetingId}/processing`

Starts processing for one prepared meeting. There is no request body and no `X-User-Id` check.

**Input.**

- `meetingId` (path, uuid): the meeting to process.

**Output.**

- 202: empty body. The response contains no transcript, summary, or tasks.
- 400, 404, 500: `MeetingReadError`. 400 is `invalid_request` when `meetingId` is not a uuid. 404 is `not_found` when that meeting has no row. 500 is `internal_error`.

**Service logic.** The service checks that the meeting exists, then enqueues one BullMQ job `{ meetingId, step: "recording-ready" }`. The worker runs the later steps: recording-ready marker, transcript segments, the summary payload filter, the summary stub, structure validation, and publication of one summary and one set of tasks. A repeated call does not create a second recording, transcript, or summary, because the worker writes a result only when that result is not already stored. Calling this endpoint does not wait for those steps to finish.

### `GET /meetings/{meetingId}/transcript`

Returns the stored transcript for a participant.

**Input.**

- `meetingId` (path, uuid).
- `X-User-Id` (header, uuid).

**Output.**

- 200: `TranscriptResponse`.
- 400, 401, 404, 500: `MeetingReadError`, as in Conventions.

404 covers a meeting that does not exist, a caller who is not a participant, and a participant whose meeting has no stored segments yet. An empty segment list is not used for the last case.

**Service logic.** The service checks participation, then loads `transcript_segments` for the meeting in `position` order. Each row becomes a `TranscriptSegment`: `speakerId` and `displayName: null`, plus `startMs`, `endMs`, and `text`.

### `GET /meetings/{meetingId}/summary`

Returns the published summary and its decisions for a participant.

**Input.**

- `meetingId` (path, uuid).
- `X-User-Id` (header, uuid).

**Output.**

- 200: `SummaryResponse`. `decisions` may be empty.
- 400, 401, 404, 500: `MeetingReadError`, as in Conventions.

404 covers a missing meeting, a non-participant, and a participant whose meeting has no published summary. An invalid summary result is not stored, so this read stays 404 after a failed validation. The transcript from the earlier step remains readable.

**Service logic.** The service checks participation, then loads the single `summaries` row and its `decisions` in `position` order. `summary` is the summary text. Each decision's `speaker_ids` become `Speaker` values with `displayName: null`. A decision may have no speakers.

### `GET /meetings/{meetingId}/tasks`

Returns the published tasks for a participant.

**Input.**

- `meetingId` (path, uuid).
- `X-User-Id` (header, uuid).

**Output.**

- 200: `TasksResponse`. `tasks` may be empty when a summary exists and has no tasks.
- 400, 401, 404, 500: `MeetingReadError`, as in Conventions.

404 covers a missing meeting, a non-participant, and a participant whose meeting has no published summary. Tasks are not readable when the summary was not published.

**Service logic.** The service checks participation, then loads `tasks` for the meeting's summary in `position` order. Each row becomes a `Task`: the local `speakerId` with `displayName: null`, the action, and the deadline as `YYYY-MM-DD`.
