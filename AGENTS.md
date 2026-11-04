<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# React Compiler

When working with React 19+ and modern Next.js versions, prefer patterns compatible with React Compiler.

Do not introduce manual memoization unless there is a clear reason.

If you use useMemo, useCallback, or React.memo, briefly justify the decision in comments or in the explanation.

# Coding conventions (frontend)

- TypeScript only
- Zod validation
- Server Actions when possible
- No any types
- avoid unnecessary client components
- shadcn components when possible
- don't modify shadcn components when it isn't necessary
- don't use margin-top if it isn't necessary
- each file can contain only one component

# Coding conventions (backend)

## General TypeScript

- Use strict TypeScript settings.
- Do not use `any`; use `unknown` and narrow it explicitly.
- Keep domain logic independent from NestJS decorators and transport details.
- Prefer small, explicit functions over implicit framework behaviour.
- Validate all external input at the boundary before it reaches application logic.
- Do not silently swallow errors; classify them and handle them explicitly.
- Keep secrets, tokens, recordings, transcripts, emails, and personal data out of logs.

## NestJS

- Organize code by business module, not by technical type alone.
- Keep controllers thin: parse input, invoke an application service, and map the result to HTTP.
- Keep business rules in services or use-case classes, not in controllers, queues, or DTOs.
- Use dependency injection for repositories, external adapters, and infrastructure services.
- Do not access the database directly from controllers.
- Keep queue processors thin and delegate work to application services.
- Use guards and server-side authorization checks for every meeting-data operation.
- Deny access by default; never treat a meeting ID as authorization.
- Prefer explicit error responses with stable error codes.

## Zod

- Use Zod schemas for request input, environment variables, external provider responses, and persisted model outputs.
- Derive TypeScript types from Zod schemas where practical.
- Validate provider responses before storing or exposing them.
- Do not duplicate the same validation rules in unrelated DTOs and services.
- Never pass unvalidated external data into domain logic.

## PostgreSQL and Drizzle

- Treat PostgreSQL as the source of truth for business state and pipeline progress.
- Define database schema in Drizzle and manage changes through committed Drizzle Kit migrations.
- Never modify the database schema manually or rely on automatic synchronization.
- Use transactions when a result and its completion marker must be stored atomically.
- Make pipeline steps idempotent; repeated job delivery must not create duplicate results.
- Keep database queries close to repositories or data-access services.
- Select only the columns needed by the operation.
- Use parameterized Drizzle queries; never build SQL by concatenating user input.
- Add indexes only for demonstrated access patterns and document non-obvious indexes.

## BullMQ and Redis

- Queue payloads must contain identifiers and step names only; never put transcripts, recordings, secrets, or personal data in jobs.
- Treat BullMQ as delivery and scheduling infrastructure, not as the source of truth.
- Make every processor safe for retries and duplicate delivery.
- Store completion state and business results in PostgreSQL in the same transaction.
- Configure explicit retry, backoff, timeout, and failure handling for each job type.
- Keep HTTP API processes and long-running workers separately deployable.
- Do not use Redis as a replacement for durable business data.

## Docker Compose

- Keep local development reproducible with Docker Compose.
- Pin service images to explicit major versions or compatible version ranges.
- Provide health checks for PostgreSQL and Redis.
- Do not commit secrets or production credentials.
- Keep service configuration in environment variables and validate required variables at startup.
- Ensure the API, worker, PostgreSQL, and Redis can be started and tested with one documented command.

## Vitest

- Test observable behaviour and business invariants rather than implementation details.
- Every authorization rule must have an allow and deny test.
- Test idempotency, transactions, repeated job delivery, invalid external data, and retry-safe processing.
- Use deterministic fixtures containing no real personal or customer data.
- Keep unit tests fast and isolated; use integration tests for database and queue boundaries.
- Do not make tests depend on execution order, wall-clock timing, or external services unless explicitly marked as contract tests.

## Swagger / OpenAPI

- Document every public endpoint, input, output, authorization requirement, and relevant error response.
- Keep OpenAPI descriptions consistent with runtime validation.
- Do not expose internal database models, secrets, provider payloads, or unauthorized meeting metadata.
- Regenerate or verify the OpenAPI document when an endpoint contract changes.

## External integrations

- Hide Google, transcription, model, and storage providers behind application-owned adapters.
- Keep provider-specific types and SDK calls inside infrastructure modules.
- Apply timeouts, bounded retries, and explicit error mapping to external calls.
- Filter and authorize meeting data before sending it to any external provider.
- Provide deterministic fake adapters for local development and automated tests.

## Technology boundaries

- Use only technologies listed as approved for the current version in `docs/tech-stack.md`.
- Do not introduce technologies listed under later versions without explicit approval.
- Before using a framework API, database driver, or library pattern, consult the version installed in the repository and its local documentation.
- Do not add dependencies when the approved stack already provides the required capability.

# Project Context and Collaboration

## Purpose

This repository contains a recruitment assignment intended to demonstrate the candidate's capabilities as a mid-level full-stack developer.

## Sources of Truth

Consult these files for the relevant context and requirements:

- `docs/offer.md` — job offer and employer expectations.
- `docs/cv.md` — candidate's experience and skills.
- `docs/zadanie.md` — assignment requirements and acceptance criteria.
- `docs/tech-stack.md` — approved technology stack. The first section is the first version. The second section is for later versions.
- `docs/authorization.md` — first-version authorization rules for meeting data,
  search, and the assistant.
- `docs/` — project notes and decision records created during the work.

Do not duplicate or infer detailed assignment requirements in this file; `docs/zadanie.md` is the authoritative source.

## Documentation

The user may ask you to save notes in `docs/`. These notes should preserve decisions, application architecture, feature behavior, data flows, corrections to AI-proposed solutions, and other information needed to prepare the assignment's written deliverable and explain the application during an interview.

Do not edit Markdown files unless the user explicitly asks you to do so.

## AI Role

Act as a research, solution-design, and implementation assistant. Propose viable approaches and explain the advantages and disadvantages of each, but leave final decisions to the user.

- Ask before making major changes or changes that conflict with the initial application specification or documents in `docs/`.
- When asked about an approach, explain reasonable alternatives before moving to implementation.
- Clearly distinguish verified facts from assumptions.
- Respond to the user in Polish. Write code, documentation, comments, and other project artifacts in English.
- Do not make important decisions independently.

## Workflow

Follow this sequence: analysis → plan → discussion of alternatives and refinements → user confirmation → small-step implementation → verification → summary.

Keep each plan and its implementation small enough to review comfortably. Split large features into multiple plans rather than creating an oversized diff.

## Decision and Planning Rules

`docs/zadanie.md` defines the assignment requirements. Approved decisions in `docs/` define the current application specification. `docs/offer.md` and `docs/cv.md` provide context, not requirements.

When requirements are ambiguous, incomplete, or conflict with an approved decision, ask a focused question before implementing. Do not silently make material assumptions.

For access-control work, treat `docs/authorization.md` as the source of truth:
only meeting participants may access meeting data in version one. The organiser
does not gain access unless they also participated. Search and assistant
retrieval must apply authorization before reading or sending content to a model.

Every implementation plan must state its goal, scope, non-goals, assumptions, alternatives, risks, verification steps, and open questions.

Do not introduce unapproved features, dependencies, refactors, or scope expansion. Present them as optional proposals and wait for user confirmation.

`docs/tech-stack.md` is the only approved technology stack. Do not add, replace, or use a technology outside that list on your own initiative. Do that only when the user asks for it or explicitly allows it. First-version work stays inside the first-version list. Technologies from the later-versions list stay unused until the user asks for them.

## Verification and Data Handling

A change is complete only after proportionate verification. Report the checks performed, their outcomes, and anything that remains unverified.

Treat sensitive data as confidential. Do not include it in logs, test fixtures, commits, or external services without an explicit, documented decision.

When documenting a decision, distinguish verified facts, assumptions, alternatives considered, the selected decision, rationale, consequences, and open questions.
