# Technology stack

Short decision record for the implementation. Written on 2026-11-02. The search story is out of scope for this version.

## First test version

The first version runs locally in Docker and must demonstrate the three in-scope user stories and Part B. Google integration, real authentication, hosting, and the frontend are intentionally replaced with test doubles.

### NestJS and TypeScript

**Why chosen**

- NestJS provides a clear module, guard, provider, and worker structure for the growing application.
- TypeScript matches the planned Next.js frontend and allows sharing types or Zod schemas later.
- It is a natural fit for BullMQ, Redis, HTTP APIs, and background workers.

**Costs and limitations**

- It introduces more structure and files than a small Fastify or Express API.
- Zod validation is not NestJS's default approach and needs an adapter or custom pipe.
- The framework does not enforce meeting-level authorization by itself; guards and policy tests are still required.

**Rejected alternatives**

- FastAPI was considered because of Pydantic and Python ML tooling, but no decisive advantage remained after considering Vercel AI SDK, Vitest, and the low probability of self-hosted transcription.
- Express/Fastify would require more application structure to be established manually.

### PostgreSQL, Drizzle ORM, and Drizzle Kit

**Why chosen**

- PostgreSQL models meetings, participants, segments, summaries, tasks, permissions, mapping history, and pipeline steps reliably.
- Drizzle keeps the schema and queries in TypeScript and makes conditional updates and transactions explicit.
- The same database setup works locally and later with Neon.

**Costs and limitations**

- Drizzle is closer to SQL than Prisma, so relations and query composition require more explicit code.
- The team must maintain conventions for schema organization, transactions, and migrations.
- A pooled Neon connection should be used by the application and a direct connection by migration commands.

**Rejected alternatives**

- Prisma was rejected because its generated client and separate schema language add another abstraction for this relatively small model.
- TypeORM was not selected because decorator-based entities would add framework coupling and make the database schema less explicit.

### BullMQ and Redis

**Why chosen**

- BullMQ provides retries, delays, concurrency, workers, and failed-job handling for NestJS.
- Redis and the worker can run in the local Docker Compose setup.
- Jobs contain only a meeting id and step name; PostgreSQL remains the source of truth for idempotency.

**Costs and limitations**

- Redis persistence must be configured; otherwise a restart can lose queued jobs.
- The worker is a separate long-running process and is not a good fit for a scale-to-zero HTTP service alone.
- At-least-once delivery still requires database state checks to prevent duplicate processing.

**Rejected alternatives**

- RabbitMQ is more durable and protocol-oriented, but adds a heavier broker and more operational configuration than this workload needs.
- QStash is kept as a possible later option, but it cannot be used by the local-only first version and stores message data in a third-party service.

### Vitest and Swagger/OpenAPI

**Why chosen**

- Vitest provides fast unit and integration tests for authorization, idempotency, schema validation, and the outbound-data filter.
- Swagger/OpenAPI makes the API demonstrable without a frontend.

**Costs and limitations**

- Tests do not prove that Google, AssemblyAI, or a model provider behaves correctly unless contract tests are added.
- OpenAPI documents the API but does not implement authorization.

**Rejected alternatives**

- Jest was not selected because Vitest is a simpler fit for the TypeScript toolchain.
- A frontend was deferred because it is not required for Part B and would reduce time available for security and pipeline tests.

### Test doubles

**Why chosen**

- A fake recording source, fake transcription provider, and fake summary provider make the complete flow reproducible without client data or external credentials.
- The fake summary returns the same Zod-validated structure as a real provider.

**Costs and limitations**

- A fake cannot demonstrate Polish transcription or real diarization quality.
- Provider-specific failures, timeouts, and rate limits need separate tests.

**Rejected alternatives**

- Real Google and AI integrations were deferred because the assignment explicitly allows stubs and the first version must run locally.

## Later versions

### AssemblyAI Universal-2 and ffmpeg

**Why chosen**

- AssemblyAI Universal-2 supports Polish, English code-switching, and speaker diarization.
- The EU endpoint and short retention configuration reduce, but do not remove, privacy concerns.
- ffmpeg extracts one mono audio track from the Meet MP4 before upload; this avoids sending video and avoids paying for multiple audio channels.

**Costs and limitations**

- Audio and transcript leave the company's infrastructure and require legal review, a DPA, retention controls, and vendor monitoring.
- Diarization produces local speaker ids, not verified Google identities, so human mapping remains necessary.
- ffmpeg and large temporary files require suitable worker storage and CPU.

**Rejected alternatives**

- Meet's native transcript was rejected because Polish is not supported in the saved transcript languages.
- A Meet bot and the deprecated Meet Media API were rejected because of privacy, maintenance, support, and lifecycle risks.
- Self-hosted Whisper/pyannote was kept as a fallback, not selected for the first implementation.

### Google Meet REST API, Drive API, and a delegated service account

**Why chosen**

- Meet provides recording metadata and Drive provides the MP4 bytes.
- `meetings.space.readonly` and `drive.meet.readonly` are narrower than full Drive access.
- Domain-wide delegation can impersonate only approved meeting organizers.

**Costs and limitations**

- The application must wait for `FILE_GENERATED`; a meeting can have no recording or the organizer can delete it.
- Domain-wide delegation is sensitive and requires strict impersonation, audit, retention, and deletion controls.
- This integration identifies participants but does not identify diarized voices automatically.

**Rejected alternatives**

- A browser bot and laptop recording were rejected as unsupported or operationally fragile.
- Google OAuth for employees is not used to download recordings; these are separate trust boundaries.

### Vercel AI SDK and model providers

**Why chosen**

- The SDK fits the TypeScript/NestJS stack and supports structured output with Zod.
- The same sample segments can be tested with OpenAI, Anthropic, Google, Mistral, or another compatible provider.
- The final choice should be based on Polish quality, output validity, latency, privacy, and cost rather than an assumed vendor.
- OpenAI with EU regional processing is the first candidate, subject to legal review and account eligibility.

**Costs and limitations**

- Each provider has different model quality, structured-output behavior, pricing, retention, and regional-processing rules.
- Provider abstractions do not remove the need for an outbound-data filter; names and emails must stay out of prompts.
- A model comparison requires representative, non-client sample data and repeatable evaluation criteria.

**Rejected alternatives**

- Pydantic AI was not selected after moving the backend to TypeScript; Vercel AI SDK provides the equivalent model comparison and Zod integration in the chosen runtime.
- A single provider was not treated as final before testing quality against cost and privacy requirements.

### Next.js, Auth.js with Google, and Vercel

**Why chosen**

- Next.js and Auth.js provide the planned employee-facing interface and Google Workspace login.
- Auth.js identifies the employee; NestJS still checks access to each meeting, transcript, clip, and mapping action.
- Vercel is a practical deployment target for Next.js and preview environments.

**Costs and limitations**

- Auth.js does not implement meeting authorization and requires careful token/session validation.
- The frontend and API have separate deployment and cookie/CORS concerns.
- Responses containing meeting data must not be incorrectly shared by CDN caching.

**Rejected alternatives**

- Firebase Authentication was not selected because Firebase Authentication stores authentication data in the United States.
- Firebase App Hosting was not selected because it would not remove the separate API deployment and would couple the frontend to another platform.
- The frontend is not part of the first test version.

### Google Cloud Run, Neon, and GitHub Actions

**Why chosen**

- Cloud Run hosts the NestJS API and can run a separately deployed worker.
- Neon provides managed PostgreSQL, pooling, branching, and a straightforward path from local PostgreSQL.
- GitHub Actions runs tests and migrations before deployment.

**Costs and limitations**

- Cloud Run request limits and scale-to-zero behavior require a separate worker for long-running steps.
- Neon pooling, direct migration connections, backups, and retention require explicit configuration.
- Deployment credentials, secrets, regions, logs, and backups become production responsibilities.

**Rejected alternatives**

- A VPS was not selected as the default because it shifts TLS, patching, scaling, backups, and worker supervision to the team.
- Firebase hosting was not selected for the backend because it does not replace a NestJS worker and PostgreSQL deployment.
- These services are deliberately absent from the first local version.

## Risks and questions before implementation

- Can the company legally send client meeting audio and transcript segments to AssemblyAI and model providers? What DPA, transfer mechanism, region, retention, and deletion rules are required?
- Which model provider wins a controlled test on Polish meetings with English terms and speaker ids? What quality and cost threshold is acceptable?
- Is manual speaker mapping an accepted company procedure, and who may map a meeting after an employee leaves?
- Which meetings must never be imported, and what signal marks confidential meetings or a recording refusal?
- What are the exact retention periods for MP4, audio extract, segments, summaries, tasks, mapping history, logs, backups, and failed jobs?
- Which Google Workspace users may be impersonated, and how will domain-wide delegation and downloads be audited?
- Can the selected Cloud Run deployment support the worker, ffmpeg storage, retries, and expected concurrency without losing a step?
- Will Redis persistence and PostgreSQL idempotency be tested with a worker crash between every pipeline step?
- How will secrets, provider logs, QStash/BullMQ data, and application logs be prevented from containing meeting content?
- Who owns production operation of Redis, the worker, Neon backups, migrations, and incident recovery?

## How AI was used

AI was used to compare NestJS and FastAPI, evaluate queues, authentication options, hosting, ORMs, and model providers, and identify risks in privacy, authorization, retries, storage, and deployment.

I asked for alternatives before choosing technologies, requested verification of current vendor documentation, and challenged conclusions that were based only on framework conventions or job-offer alignment. I made the final decisions and kept important assumptions and open legal questions explicit.
