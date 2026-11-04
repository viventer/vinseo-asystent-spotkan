# Version zero features

Features of the assignment skeleton. Behavior is defined in `docs/version-zero.md`. This file states each feature as a user story and the implementation notes that follow from it. It does not add API routes.

The example meeting already exists. It has two employee participants and one client participant. Its organizer did not attend.

The stories rely on stored meetings, participants, transcripts, summaries, tasks, and permissions. A permission is participation in the meeting. The organizer is stored and is not a participant.

## Process the example meeting

As a developer running the skeleton locally, I want one command to process the prepared meeting, so that the pipeline finishes without Google or a real model.

- Run the API, the worker, PostgreSQL, and Redis with Docker Compose.
- Seed the meeting, the three participants, and the organizer who is not a participant.
- The command enqueues processing for that meeting.
- A job carries the meeting id and the step name. The worker runs the steps in order.

## Recording ready

As the pipeline, I want a recording-ready signal for the example meeting, so that transcription can start without a media file.

- Hide the source behind a recording adapter.
- The version-zero adapter returns one stable fake recording id and reports the recording ready. It returns no file, path, URL, or audio.
- Store that marker in the same database transaction that completes the step.
- A second run finds the same marker and does not create another recording.
- Enqueue transcription only after the marker is stored.

## Transcript

As a meeting participant, I want a transcript split by local speaker labels, so that I can read what was said without a real recording.

- The transcription adapter receives the meeting id and the fake recording id. It does not open media.
- It returns a fixed set of segments. Each segment has timing, text, and a speaker id local to this meeting, such as `speaker_1`.
- Store the segments in one transaction.
- If those segments are already stored, skip the insert.

## Summary payload

As the company, I want names and email addresses kept out of the summary payload, so that a later model call cannot receive them by accident.

- Build the payload from the segments, the local speaker ids, and a role for each speaker.
- Set every role to `unknown`. This version has no speaker mapping.
- Pass the payload through a filter that allows those fields and rejects names, email addresses, and any map from a speaker id to a person.
- Call the summary adapter only after the filter accepts the payload.
- The stub does not send the payload over the network. A test asserts the filtered payload.

## Summary and tasks

As a meeting participant, I want a short summary, the decisions, and the tasks, so that the outcome of the meeting is stored in one agreed shape.

- The summary adapter returns a short summary, a list of decisions, and a list of tasks.
- A task has a speaker, an action, and a deadline. The speaker is a local speaker id from this meeting's transcript.
- Validate that shape before saving.
- Store the summary and its tasks once, in one transaction.

## Invalid summary

As a meeting participant, I want a badly shaped summary to stay unpublished, so that I never read a broken result.

- Treat the result as invalid when it is ordinary prose or empty, when the summary, the decisions, or the task list is missing, when a task lacks a speaker, an action, or a deadline, or when the speaker is a name, an email address, or an id absent from this transcript.
- Do not judge whether the text is true or whether the Polish is good.
- On failure, write nothing for the summary or the tasks. Leave the meeting and the transcript in place.
- A later attempt that returns a valid structure stores exactly one summary and one set of tasks.
- Retry a failed step a bounded number of times. `WORKER_JOB_ATTEMPTS` is the attempt count (default 5). `WORKER_JOB_BACKOFF_MS` is the exponential backoff delay in milliseconds (default 1000). `WORKER_STEP_TIMEOUT_MS` is the limit for one attempt (default 30000); a timed-out attempt fails and is retried. After the last attempt the meeting and any result stored by an earlier step stay in place.

## Restart and retry

As a developer running the skeleton, I want a crash or a repeated delivery to keep a single copy of each result, so that the meeting is neither lost nor duplicated.

- Treat the stored result as the sign that a step finished: the recording marker, the segments, or the summary and tasks.
- Keep that sign in PostgreSQL, in the same transaction as the result. Do not keep a second progress log in Redis.
- Before writing, check whether that result is already stored. BullMQ may deliver the same job more than once.
- A crash before the commit leaves the step unfinished, and the next delivery continues it.
- A crash after the commit leaves the stored result in place. A lost queue does not delete the meeting.
- Use the bounded attempt count, backoff, and step timeout from the invalid-summary rules. A stalled job is delivered again. The worker allows one such recovery (`maxStalledCount` 1) and then fails the job. The meeting remains.

## Local identity

As a caller of the local API, I want to present a stable user id, so that the API can check access without Google login.

- A local stand-in supplies the user id for a request.
- Use the same id that identifies a participant on the meeting.
- Do not call Google. A later Google login replaces the stand-in and leaves the participation check in place.

## Read meeting content

As a participant, I want to read the transcript of my meeting, so that I can see what was said.

As a participant, I want to read the summary of my meeting, so that I can see the outcome.

As a participant, I want to read the tasks of my meeting, so that I can see who is to do what, and by when.

As the organizer who did not attend, I want the transcript, the summary, and the tasks to be refused, so that organizing the meeting does not grant access.

- Expose three separate reads on the API: transcript, summary, and tasks.
- On every read, compare the caller id from the stand-in with the participants of the requested meeting. Deny by default.
- The meeting id alone does not authorize the read.
- Return content only to one of the three participants. Refuse the organizer on each read, and include none of the transcript, the summary, or the tasks in that refusal.
- Return speaker ids as ids. Do not replace them with display names.
- Test the rules. A participant can read each of the three resources. The organizer who did not attend is refused on each read, and the refusal contains none of them. A different meeting id does not open a read.

## Not in this version

Audio and video files, Google Meet, Google Drive, Google login, real transcription, a real summary model, speaker mapping, consent, retention, deletion, a meeting list, search, an assistant, notifications, and a user interface. Consent, retention, and deletion wait until preparation for the whole company.
