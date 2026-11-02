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

# Project Context and Collaboration

## Purpose

This repository contains a recruitment assignment intended to demonstrate the candidate's capabilities as a mid-level full-stack developer.

## Sources of Truth

Consult these files for the relevant context and requirements:

- `docs/offer.md` — job offer and employer expectations.
- `docs/cv.md` — candidate's experience and skills.
- `docs/zadanie.md` — assignment requirements and acceptance criteria.
- `docs/tech-stack.md` — approved technology stack. The first section is the first version. The second section is for later versions.
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

Every implementation plan must state its goal, scope, non-goals, assumptions, alternatives, risks, verification steps, and open questions.

Do not introduce unapproved features, dependencies, refactors, or scope expansion. Present them as optional proposals and wait for user confirmation.

`docs/tech-stack.md` is the only approved technology stack. Do not add, replace, or use a technology outside that list on your own initiative. Do that only when the user asks for it or explicitly allows it. First-version work stays inside the first-version list. Technologies from the later-versions list stay unused until the user asks for them.

## Verification and Data Handling

A change is complete only after proportionate verification. Report the checks performed, their outcomes, and anything that remains unverified.

Treat sensitive data as confidential. Do not include it in logs, test fixtures, commits, or external services without an explicit, documented decision.

When documenting a decision, distinguish verified facts, assumptions, alternatives considered, the selected decision, rationale, consequences, and open questions.
