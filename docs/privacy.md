# Security and privacy

This is a proposed product policy, not legal advice. I am a software
developer, not a lawyer. GDPR, consent, vendor, and retention decisions must
be reviewed by Vinseo's data protection specialist or lawyer before production.

## Rules

- A meeting is recorded only when every participant has consented.
- Clients are asked for consent at the start of the meeting. Employees consent
  through the application using their Google Workspace account.
- If anyone refuses, recording does not start. If consent is withdrawn,
  recording stops and the recording is deleted. Late joiners must consent too.
- Confidential meetings are never imported. A Google Calendar label such as
  `confidential` or `do-not-record` may be used as an additional import block.
- Meetings without complete consent and confidential meetings are excluded by
  default, even if a recording exists.

Whether the read-only Google integration can stop a recording must be verified.
If it cannot, the host must stop it and the application must not import the
file. The legal basis for employees and clients must also be confirmed;
employee consent may not always be considered freely given.

## External processing

Only approved processors are used:

- AssemblyAI receives the extracted audio for transcription and diarization;
- a separate approved LLM provider receives segments for summaries and tasks;
- Google Workspace remains the source of recordings and identities.

External models receive audio or transcript segments, local speaker IDs
(`speaker_1`, `speaker_2`) and roles (`employee`, `client`, `unknown`).
They do not receive names, emails, participant mappings, or unnecessary
metadata. These IDs are pseudonyms, not anonymous data.

Before approval, Vinseo must review each provider's DPA, data location,
international transfers, subprocessors, retention, support access, and
deletion guarantees.

## Retention and deletion

Initial retention limits:

- MP4 copy: 48 hours maximum;
- extracted audio: up to 7 days, for manual speaker mapping;
- transcript, summary, and tasks: 24 months;
- provider copies: deleted after the result is stored, where supported;
- backups: expire under the backup retention policy.

The 24-month period is provisional and requires confirmation before
implementation. Withdrawal of consent or an approved deletion request removes
the MP4, audio, transcript, summary, tasks, mappings, indexes, and other
derived data from active systems. Backups expire normally and must not
reintroduce deleted data.

## Access and employee departure

In version one, meeting data is available only to meeting participants.
The organiser does not receive access merely because they organised the
meeting. Sharing with non-participants, including later project members, is
disabled.

The API checks permissions before returning data or sending text to a model.
An assistant must never enforce permissions itself or receive the whole company
corpus.

When an employee leaves, access is revoked immediately but historical meeting
data remains. A remaining participant may correct that employee's speaker
mapping. Mapping history records who changed what and when.

The audit should record imports, reads, permission changes, exports, deletions,
and unauthorised access attempts, without storing recordings or full
transcripts in logs.

## Open decisions before production

1. Legal basis and information notice for employees and clients.
2. Final retention periods, including the 24-month proposal.
3. Vendor DPAs, international transfers, and deletion guarantees.
4. Sharing historical meetings with later project members.
5. Owner and process for privacy requests and security incidents.
6. Whether a DPIA is required.
7. Whether Google Meet can technically stop recording after consent is
   withdrawn.

The design uses data minimisation, least-privilege access, pseudonymisation,
and explicit deletion, but it does not by itself prove GDPR compliance.
