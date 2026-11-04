# Version-zero API and Worker Building Plan

Implement the backend in small, verifiable steps. Keep the API and worker as
separate processes, but share feature modules and application services.

## 1. Project and runtime foundation

- Confirm the NestJS entrypoints for the API and worker.
- Add Docker Compose services for PostgreSQL and Redis.
- Add Zod-based environment configuration.
- Keep `GET /health` independent of PostgreSQL and Redis.
- Add the basic application error and UUID-validation primitives.

## 2. PostgreSQL and Drizzle

- Add the Drizzle client and transaction helper.
- Define the database tables according to `docs/data-model.md`.
- Generate and commit the initial Drizzle Kit migration.
- Add a deterministic local seed for users, one meeting, participants, and
  the non-participating organizer.
- Verify migrations and seeding from a clean database.

## 3. Queue infrastructure

- Configure the BullMQ connection using Redis.
- Define queue names and the Zod schema for job payloads.
- Keep job payloads limited to identifiers and a step name:
  `{ meetingId, step }`.
- Add an enqueue service that can be used by the processing feature.
- Do not store pipeline progress in Redis.

## 4. Users and meetings

- Implement `users` table access, repository, service, and seed support.
- Implement `meetings` and `meeting_participants`.
- Add `MeetingAccessService` with deny-by-default participation checks.
- Add the local `X-User-Id` identity stand-in.
- Test participant access, non-participant denial, and organizer denial when the
  organizer did not participate.

## 5. Recordings

- Implement the `recordings` table with one recording per meeting.
- Define the `RecordingSourceAdapter` port and a fake adapter.
- Make the version-zero adapter return one stable recording-ready identifier.
- Store the recording-ready marker transactionally and idempotently.
- Do not create audio, video, paths, or URLs in version zero.

## 6. Transcripts

- Implement `transcript_segments` and ordered segment persistence.
- Define the transcription adapter port and fake adapter.
- Return deterministic segments with meeting-local speaker IDs.
- Store all segments transactionally and skip an already stored transcript.
- Add the participant-protected transcript read endpoint.

## 7. Summaries and tasks

- Implement `summaries`, `decisions`, and `tasks`.
- Define the summary adapter port and fake adapter.
- Build an outbound payload containing only segments, local speaker IDs, and
  roles set to `unknown`.
- Validate and reject payloads containing names, emails, or person mappings.
- Validate model output with Zod before persistence.
- Store a valid summary, decisions, and tasks in one transaction.
- Leave invalid results unpublished and keep the transcript readable.
- Add participant-protected summary and task read endpoints.

## 8. Processing orchestration

- Add the processing service and `POST /meetings/:meetingId/processing`.
- Check that the meeting exists, then enqueue the first step.
- Implement the ordered steps:
  `recording-ready` → `transcribe` → `summarize-and-publish`.
- Delegate database work to the owning feature services.
- Make every step safe for retries and duplicate job delivery.
- Enqueue the next step only after the current result is committed.

## 9. Worker process

- Implement `worker.module.ts` without starting an HTTP server.
- Implement `worker.ts` as the BullMQ worker bootstrap.
- Add a thin processor that validates the job and delegates to processing
  services.
- Configure explicit retry, backoff, timeout, and failure handling.
- Verify that a restart or repeated delivery does not duplicate results or lose
  the meeting.

## 10. Verification and local execution

- Add unit tests beside services and adapters.
- Add integration tests for HTTP, PostgreSQL, and BullMQ boundaries.
- Verify every authorization rule with allow and deny cases.
- Verify invalid summary output, outbound-data filtering, idempotency, and
  repeated job delivery.
- Provide one documented command that starts the stack, seeds the example
  meeting, enqueues processing, and allows reading the results.

## Intentionally excluded from version zero

- Google Meet, Google Drive, and Google login.
- Real audio files, transcription, diarization, and summary models.
- Speaker mapping, search, assistant, notifications, and UI.
- Consent, retention, and deletion workflows.
