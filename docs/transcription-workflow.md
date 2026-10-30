# Transcription workflow

Functional specification of the first version. The decision records are `notes/transcription-workflow-recap.md` and `notes/transcription-model-recap.md`.

## Flow

1. A meeting is held in Google Meet with recording on.
2. Meet saves one MP4 on the organizer's Drive. The app reads it only when the recording state is `FILE_GENERATED`.
3. A service account with domain-wide delegation impersonates the organizer and downloads the file.
4. Scopes: `meetings.space.readonly` and `drive.meet.readonly`. The app impersonates only organizers of recorded meetings.
5. Discovery is either a Workspace Events subscription or polling of those organizers' conference records.
6. An audio track is extracted from the MP4. AssemblyAI Universal-2 transcribes it and returns speaker labels. Backchannels such as "mhm" are not kept as segments.
7. Each segment has a start, an end, text, and a speaker id. The id belongs to this meeting only. The id is the label returned for this file, not a person.
8. An external LLM receives the segments, the speaker ids, and the role `unknown` for every speaker. It returns a structured summary and tasks. Quotes and task owners are speaker ids.
9. The transcript, summary, tasks, and Meet participant list are published immediately.
10. Any employee who attended and who can access the recording may map speakers. For each speaker they see a quote, can play a clip, and either assign a Meet participant or skip.
11. The same action sets the role. An internal Workspace account defaults to `employee`. A guest on the Meet list defaults to `client`. The mapper can change the role.
12. When a role changes, the LLM runs again on the same segments, with the new roles. Speakers still unmapped stay `unknown`. A mapping edit that does not change a role does not call the LLM.
13. On read, the API checks access and replaces speaker ids with display names. An unmapped speaker stays an id.

## Transcription

- Model: AssemblyAI Universal-2.
- Endpoint: `https://api.eu.assemblyai.com`.
- `speech_models` is `["universal-2"]`. `language_codes` is `["en", "pl"]`. `speaker_labels` and `punctuate` are on. `language_detection` is not set.
- The uploaded file is one mono audio track.
- Speaker count is a range, not an exact number.
- The account time-to-live is the shortest the API allows. After the segments are stored, the transcript at AssemblyAI is deleted.
- Training on submitted files is off.

## Stored records

- **Segment:** meeting, speaker id, start, end, text.
- **Mapping:** meeting, speaker id, person or empty, role (`unknown`, `employee`, `client`), who changed it, when. History is kept. The screen shows the current row.
- **Person:** an internal Workspace user, or a Meet participant who was on this meeting.
- **Summary and tasks:** speaker references are ids. Names are applied only when the API builds the response.

## What the LLM receives

Speaker ids, each speaker's role, and the words that were said.

The LLM does not receive names, emails, or the mapping from id to person.

## Search

1. Keep only meetings the caller may read.
2. Resolve the name in the question to one person. If several people match, ask which one.
3. Take that person's mapped segments. Leave out unmapped segments. If the meeting still has unlabeled speakers, say so.
4. Send those quotes to the LLM, still keyed by speaker id and role.
5. Put names on the answer only in the response to the caller.

The assistant does not treat someone on the participant list as the speaker of an unmapped id. A name from the list is shown as a speaker only after a human mapping, or inside a quote where that name was spoken.

## Not in this version

- Merging speakers, splitting a speaker by moving segments, or marking a segment as mixed.
- Adding a person who was not a Meet participant.
- Voice profiles.
- Automatic suggestions from spoken names or from join time.
- Sharing a meeting with someone who was not on the call.
- A bot joining the meeting.
- Meet's own transcript as the Polish text.
