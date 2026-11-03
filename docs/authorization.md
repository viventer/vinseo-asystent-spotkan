# Authorization

This document defines the first-version access-control rules for meeting data.
It is an implementation specification, not legal advice.

## Access policy

The following resources belong to a meeting:

- the recording and extracted audio,
- the transcript and speaker mappings,
- the summary,
- extracted tasks,
- search index entries and other derived data.

In version one, all of these resources are readable only by users who
participated in that meeting. The meeting organiser does not receive access
merely because they created the calendar event or are marked as its organiser.
If the organiser did not participate, they must be denied access.

The following do not grant access:

- being an employee of the company,
- belonging to the same team or project,
- having access to the calendar event,
- taking over the project later,
- knowing or guessing a meeting identifier.

Sharing transcripts or summaries with non-participants is out of scope for the
first version. It is a future product decision and must not be implemented as
an implicit exception.

## Enforcement requirements

Authorization is server-side and deny-by-default. Every endpoint that returns,
searches, exports, or processes meeting data must verify the authenticated
user's stable Google Workspace identity against the meeting participants.

The client interface must not be treated as a security boundary. The API must
perform the check before:

- returning a meeting, transcript, summary, task, or recording,
- returning metadata that could reveal a restricted meeting,
- sending transcript content to an external model,
- generating embeddings or search results,
- creating source links for an assistant response.

Meeting identifiers must not be treated as authorization. Resource lookups must
use the authenticated user as part of the authorization query to prevent IDOR
vulnerabilities.

## Search

Search is limited to summaries of meetings in which the current user
participated. The authorization filter must be applied before full-text or
vector search, not after results have already been produced.

Search results must not reveal restricted:

- titles or meeting existence,
- snippets,
- result counts or relevance scores,
- participant names,
- source links,
- error messages that confirm the presence of a meeting.

Search indexes and caches must retain the meeting authorization scope. When
access is revoked or data is deleted, the meeting must be removed from active
search results and relevant caches.

## Assistant and retrieval

The assistant must never receive the company's entire meeting corpus and must
not be responsible for enforcing permissions. The retrieval layer must:

1. authenticate the user;
2. restrict candidate meetings to meetings where the user participated;
3. retrieve context only from that authorized set;
4. provide the selected context to the model;
5. verify source authorization again before returning the answer and citations.

If no authorized information is available, the system should return a neutral
answer such as "No available information was found." It must not confirm that a
restricted meeting exists.

Assistant response caches, conversation history, exported files, notifications,
and source URLs must not bypass the same authorization checks. A source URL
must authorize the current request instead of relying on an unguessable URL.

## Identity and lifecycle

Participant access is based on a stable authenticated account identifier, not
on a display name or an email address supplied by the client. The application
must record the participant relationship used for authorization.

When an employee leaves the organization, access through their Google
Workspace identity is revoked immediately. Historical meeting data is not
automatically deleted solely because the employee left. A future sharing
feature would require an explicit, auditable grant; it must not be inferred
from a new project role.

## Audit and tests

The audit trail should record reads, exports, permission changes, deletions,
and unauthorized access attempts with the actor, object identifier, operation,
and timestamp. It must not contain full recordings or transcripts.

The first-version test suite must verify at least that:

- a participant can read their meeting data;
- a non-participant cannot read it;
- an organiser who did not participate cannot read it;
- changing a meeting identifier does not bypass authorization;
- search cannot return another user's summary or metadata;
- the assistant cannot cite an unauthorized source;
- source links re-check authorization;
- revoked access removes the meeting from subsequent search results and
  invalidates relevant cached responses.
