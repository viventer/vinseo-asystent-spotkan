# Implementation Plan

## Stage 0: Concept and assignment prototype

- Describe the business problem and the target user flow.
- Define the architecture, data model, processing steps, and failure handling.
- Define privacy, consent, retention, and access-control rules.
- Define the technology and model choices with their trade-offs.
- Define development, test, staging, and production environments.
- Define security risks, open questions, rollout stages, and success criteria.
- Implement the Part B code skeleton:
  - API and data model,
  - processing pipeline,
  - structured output validation,
  - authorization,
  - outbound-data protection,
  - tests and local execution.
- Use a transcription and summary stub only for the assignment code.
- Include a recording-source adapter whose version-zero implementation returns
  one stable recording-ready marker, but do not create a simulated recording
  file or audio fixture.

## Stage 1: API prototype

- Add a Google Cloud Storage bucket as the recording source.
- Add real AssemblyAI transcription and speaker diarization.
- Add a real AI API for summaries and action items.
- Store Polish transcript segments with local speaker IDs.
- Store validated summaries, decisions, and tasks.
- Add retries, idempotency, provider error handling, and processing status.
- Add deletion and retention handling for uploaded recordings and derived data.
- Add tests using approved non-confidential recordings and purpose-recorded
  fictional meetings.
- Verify the core pipeline and output quality.
- Do not add participant-to-speaker mapping yet.
- Do not add Google Meet or Google Drive integration yet.

## Stage 2: Internal MVP

- Add Google Meet and Google Drive integration.
- Add Google Workspace authentication.
- Add a simple graphical frontend:
  - meeting list,
  - processing status,
  - transcript,
  - summary and tasks,
  - speaker-mapping screen.
- Allow a meeting participant to map speaker IDs to meeting participants.
- Support `employee`, `client`, and `unknown` roles.
- Keep unmapped speakers as local IDs.
- Enforce meeting-level authorization in the API.
- Pilot with a few selected employees and several low-sensitivity internal
  meetings.
- Exclude client, HR, recruitment, management, legal, financial, and
  confidential meetings.
- Collect user feedback and quality measurements.

## Stage 3: Preparation and company-wide rollout

- Confirm that security testing found no unresolved critical gaps.
- Confirm that transcription, diarization, summaries, and tasks are useful
  enough for normal company use.
- Confirm reliable processing, retries, deletion, retention, and backup
  procedures.
- Set up monitoring for the API, workers, queue, database, storage, and
  providers.
- Confirm privacy review, consent handling, provider configuration, and
  incident procedures.
- Provide employee guidance and assign operational ownership.
- Prepare company-wide access under the meeting-participant policy.
- Roll out the system to the whole company after all checks pass.

## Stage 4: Post-rollout monitoring and feedback-driven development

- Collect feedback from users.
- Monitor real-world quality, errors, processing time, and actual costs.
- Monitor unauthorized-access attempts and incidents.
- Prioritize improvements based on observed problems and user needs.
- Define the scope of:
  - transcript search,
  - a source-based question-answering assistant,
  - transcript editing,
  - speaker merge and split tools,
  - task notifications and integrations,
  - explicit sharing with non-participants.
- Validate each new feature separately for quality, security, privacy, and
  operational cost.

## Permanently out of scope

- Voice-based person identification.
- Voice profiles or a voice database.
- Automatic assignment of a voice to a Google account.

## Success criteria for moving forward

- No unauthorized access or data disclosure.
- The API prototype produces usable transcripts, summaries, and tasks.
- Retries do not create duplicates or lose meetings.
- Invalid model output is never published.
- Internal pilot users can use the frontend and map speakers.
- Security, privacy, and deletion tests pass.
- Quality, processing time, and costs remain within agreed limits.
- Pilot feedback supports the next rollout stage.
