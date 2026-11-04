# Database

## users

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| id | uuid | yes | PK |
| display_name | text | yes | |
| email | text | yes | unique |

## meetings

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| id | uuid | yes | PK |
| organizer_user_id | uuid | yes | FK users.id, ON DELETE RESTRICT |

## recordings

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| id | uuid | yes | PK |
| meeting_id | uuid | yes | FK meetings.id, unique, ON DELETE RESTRICT |
| external_id | text | yes | unique |

## meeting_participants

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| meeting_id | uuid | yes | PK, FK meetings.id, ON DELETE RESTRICT |
| user_id | uuid | yes | PK, FK users.id, ON DELETE RESTRICT |
| role | participant_role | yes | employee or client |

## transcript_segments

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| id | uuid | yes | PK |
| meeting_id | uuid | yes | FK meetings.id, ON DELETE RESTRICT |
| position | integer | yes | unique (meeting_id, position), >= 0 |
| speaker_id | text | yes | non-empty |
| start_ms | integer | yes | >= 0 |
| end_ms | integer | yes | >= start_ms |
| text | text | yes | |

## summaries

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| id | uuid | yes | PK |
| meeting_id | uuid | yes | FK meetings.id, unique, ON DELETE RESTRICT |
| text | text | yes | non-empty |

## decisions

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| id | uuid | yes | PK |
| summary_id | uuid | yes | FK summaries.id, ON DELETE RESTRICT |
| position | integer | yes | unique (summary_id, position), >= 0 |
| text | text | yes | non-empty |
| speaker_ids | text[] | yes | may be empty; each element non-empty |

## tasks

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| id | uuid | yes | PK |
| summary_id | uuid | yes | FK summaries.id, ON DELETE RESTRICT |
| position | integer | yes | unique (summary_id, position), >= 0 |
| speaker_id | text | yes | non-empty |
| action | text | yes | non-empty |
| deadline | date | yes | |

# API

## HealthResponse

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| status | string | yes | `ok` |

## MeetingReadRequest

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| meetingId | uuid | yes | |
| callerUserId | uuid | yes | users.id |

## Speaker

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| speakerId | string | yes | |
| displayName | string \| null | yes | always present; null in version zero |

## TranscriptSegment

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| speaker | Speaker | yes | |
| startMs | number | yes | |
| endMs | number | yes | |
| text | string | yes | |

## TranscriptResponse

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| segments | TranscriptSegment[] | yes | |

## Decision

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| text | string | yes | |
| speakers | Speaker[] | yes | may be empty |

## SummaryResponse

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| summary | string | yes | |
| decisions | Decision[] | yes | may be empty |

## Task

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| speaker | Speaker | yes | |
| action | string | yes | |
| deadline | string | yes | YYYY-MM-DD |

## TasksResponse

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| tasks | Task[] | yes | may be empty |

## MeetingReadError

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| error | string | yes | `not_found`, `unauthenticated`, `invalid_request`, or `internal_error`. `not_found` when the meeting does not exist, the caller is not a participant, or the resource has no row. `unauthenticated` when `X-User-Id` is missing or not a uuid. `invalid_request` when a path id is not a uuid. `internal_error` for an unexpected failure |
