# Backend structure

Rules for laying out the NestJS backend. Behavior, routes, and the data model live in `docs/version-zero.md`, `docs/api.md`, and `docs/data-model.md`. This file says where code goes and which way dependencies point.

The backend is one NestJS application in `backend/`. The API and the worker are separate processes, with separate entrypoints and root modules, and they share the feature code.

`nestjs-zod` is an approved exception to `docs/tech-stack.md`. Use it for request and response DTOs and for OpenAPI. Do not hand-write OpenAPI schemas, and do not add class-validator.

## Layout

```
backend/
├── drizzle/                 # committed Drizzle Kit migrations
├── drizzle.config.ts
├── test/                    # integration tests: HTTP, database, queue
└── src/
    ├── main.ts              # API bootstrap
    ├── worker.ts            # worker bootstrap, no HTTP server
    ├── app.module.ts        # API root module
    ├── worker.module.ts     # worker root module
    ├── config/              # Zod env schema and typed config
    ├── database/            # Drizzle client, transaction helper, seed
    ├── queue/               # BullMQ connection, queue names, job payload schemas
    ├── shared/
    │   ├── decorators/        # @CallerUserId(), the version-zero X-User-Id stand-in
    │   ├── filters/         # map errors to stable error codes
    │   ├── guards/
    │   ├── interceptors/
    │   ├── pipes/           # app-owned pipes, such as a uuid pipe
    │   └── errors/
    ├── health/
    ├── users/
    ├── meetings/
    ├── recordings/
    ├── transcripts/
    ├── summaries/
    └── processing/
```

## Feature shape

Keep files flat in the feature directory. Add a subdirectory only when the feature has more than three files of the same role. One responsibility per file. Import from the file itself, never through an `index.ts` barrel.

```
transcripts/
├── dto/
│   └── transcript-response.dto.ts
├── entities/
│   └── transcript-segment.table.ts
├── adapters/
│   ├── transcription.adapter.ts
│   └── fake-transcription.adapter.ts
├── transcripts.controller.ts
├── transcripts.service.ts
├── transcripts.repository.ts
├── transcripts.module.ts
└── transcripts.service.spec.ts
```

| File | Responsibility |
| --- | --- |
| `*.module.ts` | Wires providers and exports the feature's public service. |
| `*.controller.ts` | Maps HTTP to a service call and a status code. No business rules and no database access. |
| `*.service.ts` | Use cases and business rules. |
| `*.repository.ts` | The only file in the feature that runs Drizzle queries. Selects the columns the operation needs. |
| `entities/*.table.ts` | One Drizzle table. |
| `dto/*.dto.ts` | A Zod schema and a `createZodDto` class. |
| `adapters/*.adapter.ts` | The port: an interface and an injection token. |
| `adapters/fake-*.adapter.ts` | The local stand-in. A real provider is another file in `adapters/`. |
| `*.processor.ts` | A thin BullMQ processor. It delegates to a service. |
| `*.spec.ts` | A unit test, next to the file it covers. |

## What each feature owns

- `health` — `GET /health`. No database and no queue.
- `users` — the `users` table and lookup by id. Nothing else in version zero.
- `meetings` — `meetings`, `meeting_participants`, and the only implementation of the participation rule (`MeetingAccessService`). Features that read meeting content call that service before loading it. A later meeting list and speaker mapping stay in this feature.
- `recordings` — the `recordings` table and `RecordingSourceAdapter`. The service stores the recording-ready marker once.
- `transcripts` — `transcript_segments`, the transcription port, and `GET /meetings/:meetingId/transcript`.
- `summaries` — `summaries`, `decisions`, and `tasks`; the outbound payload filter; the summary port; Zod validation of the model result; `GET .../summary` and `GET .../tasks`.
- `processing` — `POST /meetings/:meetingId/processing`, the worker processor, and the service that runs steps by calling the other features' services. It has no tables. A finished step is the stored result in PostgreSQL, not a status written to Redis. The job schema lives in `queue/`.
- `config`, `database`, `queue`, and `shared` hold infrastructure and no meeting rules. The version-zero caller identity is `@CallerUserId()` in `shared/decorators`. It reads `X-User-Id` and a pipe rejects a missing or non-uuid value as `unauthenticated`. On a meeting read, `@Param(..., ParseUuidPipe)` is the rightmost parameter. Nest records parameter metadata from right to left and reports the first of those failures, so a malformed path id stays `invalid_request` even when the header is missing.

`app.module.ts` imports the HTTP features. `worker.module.ts` imports `processing` and the features the pipeline calls. Neither process starts the other.

## Dependencies

- The call chain is controller, then service, then repository.
- A feature may depend on another feature only through that feature's module and its exported service. It does not inject another feature's repository and does not query another feature's tables.
- The one exception is a foreign key: a `*.table.ts` file may import another feature's `*.table.ts` for `references()`. Point the import at the parent table, for example transcripts to meetings and meetings to users. Do not import back.
- `processing` may import `recordings`, `transcripts`, `summaries`, and `meetings`. Those features do not import `processing`. A feature that only needs to enqueue work imports `queue`.
- Do not create a dependency cycle.

## Database

- `drizzle.config.ts` points Drizzle Kit at `./src/**/*.table.ts`. Do not add a schema barrel that re-exports tables.
- Construct the Drizzle client without a schema object. Use the query builder (`select`, `insert`, `update`, `delete`). Do not use `db.query` or `relations()`.
- Use the transaction helper in `database/` when a result and its completion must commit together. Repositories join that transaction. Services do not run queries of their own.
- A repository checks that the result is not already stored before writing.

## Validation and OpenAPI

Validate with Zod at every boundary: HTTP input, environment variables, queue payloads, and provider responses. Derive types with `z.infer`.

Register `ZodValidationPipe` from `nestjs-zod` in `main.ts`. Do not write a second validation pipe. Pass the OpenAPI document through `cleanupOpenApiDoc` so the Zod DTOs appear in Swagger. Follow the API of the installed `nestjs-zod` version.

A queue payload contains identifiers and a step name only.

## Providers

Hide a recording source, a transcription provider, and a summary model behind an adapter port. The service depends on the token, not on a concrete class. Version zero binds the fake. SDK types stay inside `adapters/`.

## Naming

Use `kebab-case` file names with the role as the suffix: `meetings.service.ts`, `meeting.table.ts`, `transcript-response.dto.ts`, `recording-source.adapter.ts`, `fake-recording-source.adapter.ts`.

## Tests

- Unit tests sit next to the source as `*.spec.ts`. They do not open a database or Redis.
- Integration tests live in `backend/test/` and cover HTTP, the database, and the queue.
- Every authorization rule has an allow test and a deny test.

## Adding a feature

1. Create the directory and the module.
2. Add `entities/*.table.ts`. The Drizzle Kit glob picks it up. Generate a committed migration.
3. Add Zod DTOs with `createZodDto`.
4. Add the repository, then the service, then the controller.
5. Put each external provider behind a port and a fake adapter.
6. Add unit tests beside the service, and an integration test when the feature crosses HTTP, the database, or the queue.
7. Import the module from `app.module.ts`. Import it from `worker.module.ts` only when the worker runs it.
8. Confirm the route is present in the generated OpenAPI document.

## Growing past version zero

- A new recording source or model is a new adapter file. The service stays the same.
- A new pipeline step is a step name in `queue/` plus a method on the owning feature's service, called from `processing`.
- Search, the assistant, and speaker mapping are new or extended feature directories. Speaker mapping extends `meetings`. Google login replaces the `@CallerUserId()` parameter decorator in `shared/decorators` and leaves `MeetingAccessService` in place.
- The two entrypoints keep the API and the worker deployable on their own.
