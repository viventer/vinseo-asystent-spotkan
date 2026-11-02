# Search and meeting assistant

Decision record for searching meeting transcripts and answering questions with
sources. Written on 2026-11-02 from the discussion and decisions made before
implementation.

This record describes the planned later feature. Search and the assistant are
explicitly out of scope for the first version.

## 1. Decision summary

### Search is deferred from the first version

**Chosen.** The first version will not implement transcript search or the
question-answering assistant.

**Reasons.**

- Search is not necessary for the rest of the system to function correctly.
- The remaining features already provide enough value to validate the product
  idea through an MVP: importing a meeting, processing it, producing a Polish
  transcript, generating a structured summary, extracting tasks, and enforcing
  access control.
- Correctly implementing and testing search would require substantially more
  time because it includes many edge cases and different question types.
- Search is a security-sensitive feature: an incorrect retrieval filter or
  generated answer could disclose a meeting, transcript fragment, client name,
  or task to a person without access.
- Search quality cannot be validated with framework tests alone; it requires a
  representative, non-confidential evaluation set covering Polish language,
  English campaign names, paraphrases, misspellings, numbers, dates, and
  multi-meeting questions.

**Consequence.** The first version must still store stable meeting, segment,
summary, task, speaker, and permission identifiers so that search can be added
without redesigning the processing pipeline.

**Not a decision.** This does not mean search is unnecessary for the eventual
product; it means that its quality and security bar is too high for the first
implementation scope.

## 2. Planned technology

The planned implementation stays within the selected TypeScript and PostgreSQL
architecture:

- **NestJS** will expose the search API and coordinate query planning,
  authorization, retrieval, model calls, and response validation.
- **PostgreSQL** will remain the source of truth for meetings, participants,
  speaker mappings, transcript segments, summaries, tasks, permissions, and
  source references.
- `pg_trgm` will support lexical matching for names, company names, titles,
  campaign identifiers, numbers, and misspellings.
- `pgvector` will store embeddings and support semantic matching for
  paraphrases and related terms, such as “budget” and “media spend”.
- **Vercel AI SDK** will provide provider-independent embedding and structured
  generation APIs, including Zod validation.
- **OpenAI** is the first candidate provider for embeddings and answer
  generation, subject to the same legal, regional-processing, retention, and
  quality review as the other model providers.
- **Zod** will validate the parsed query plan, extracted values, generated
  answer, and source identifiers.

This technology choice does not authorize adding `pgvector`, `pg_trgm`, model
providers, or search dependencies to the first version.

## 3. Search principles

1. Authorization happens before retrieval and before any text is sent to a

   model.

2. The model never searches the company-wide corpus and is never trusted to

   enforce permissions.

3. The API selects the evidence; the model writes an answer only from that

   evidence.

4. Source quotes are loaded verbatim from PostgreSQL after generation rather

   than being trusted from model-generated text.

5. Speaker names and emails remain in internal mapping tables and are resolved

   only in the response shown to an authorized caller.

6. Unmapped speakers are not guessed from the participant list.
7. Mathematical operations, counts, and comparisons are performed by application

   code, not invented by the model.

8. A low-confidence or ambiguous result produces a clarification or

   insufficiency response instead of a guessed answer.

## 4. Indexing flow

1. After transcript segments are stored, a worker groups neighboring segments

   into searchable chunks with a meeting id, time range, segment ids, speaker
   ids, and text without person names or email addresses.

2. After the structured summary passes validation, the worker stores decisions

   and tasks with their speaker ids, roles, and source segment ids.

3. The worker generates embeddings for chunks, decisions, and tasks using the

   same embedding model used for queries.

4. PostgreSQL stores the embeddings and creates lexical indexes for searchable

   text.

5. A speaker mapping change does not change the raw transcript chunks, but it

   can trigger regeneration and re-indexing of affected structured decisions.

6. Every searchable record retains its meeting id so that the authorization

   predicate can be applied to every retrieval query.

The transcript is searchable, but decisions and tasks receive higher ranking
priority because they contain more signal for questions about agreements and
responsibilities.

## 5. Common query flow

1. The NestJS endpoint receives the authenticated user id, question, and

   optional context such as the meeting currently open in the UI.

2. The authorization layer builds the set of meetings the user may read.
3. A query planner classifies the question as a supported meeting question,

   clarification request, comparison, list, count, metadata request, or
   unsupported request.

4. The planner extracts possible entities, time ranges, meeting references,

   topics, requested output shape, and comparison or counting requirements.

5. The API resolves names and companies against authorized people and meetings

   using lexical matching that tolerates misspellings.

6. If a name has multiple plausible matches, the API asks the user to choose

   rather than guessing.

7. The API resolves explicit time ranges, relative ranges such as “last

   meeting”, the meeting open in the UI, titles, campaign names, or multiple
   explicitly named meetings.

8. If the question contains only a topic and no usable scope, the API asks for a

   client, meeting, or time range and does not call a model.

9. The API applies the resolved scope and authorization filter before retrieving

   any transcript, decision, task, or participant record.

10. The retrieval layer combines semantic vector similarity with lexical

    similarity and merges the rankings.

11. The retrieval layer prioritizes decisions and tasks, then adds neighboring

    transcript chunks as supporting evidence.

12. Evidence from unmapped speakers is excluded when the question requires a

    person identity, and the response records that part of the conversation may
    be incomplete.

13. If the evidence score is below a configured threshold, the API returns that

    the available meetings do not contain a sufficiently supported answer.

14. The prompt builder sends only selected evidence, local speaker ids, roles,

    and the question, without a speaker-to-person legend.

15. The model returns a Zod-validated answer and references to the supplied

    evidence records.

16. The API rejects malformed output, retries once when appropriate, and returns

    an error without publishing an unvalidated answer after a second failure.

17. The API intersects returned references with the authorized evidence set and

    rejects references that were not supplied to the model.

18. The API fetches exact source text, timestamps, meeting metadata, and

    speaker mappings from PostgreSQL.

19. The response serializer resolves speaker ids to names only for the

    authorized caller.

20. The endpoint returns the answer, source quotes, meeting identifiers,

    timestamps, and any limitation or clarification message.

## 6. Supported question types

### Single fact or agreement

- **Concerns:** One agreement, decision, task, or answer within a defined
  meeting, person, client, or time scope.
- **Supported by the planned flow:** Yes; retrieve decisions and tasks first,
  use transcript chunks as evidence, and return a source.
- **Additional work:** None beyond the common flow.

### Topic without scope

- **Concerns:** A question such as “What budget did we agree on?” without a
  person, meeting, title, or time range.
- **Supported by the planned flow:** Yes; stop before retrieval and ask for
  more detail.
- **Additional work:** None beyond query-scope validation.

### Relative or explicit time

- **Concerns:** “At the last meeting”, “yesterday”, “this month”, or a named
  date range.
- **Supported by the planned flow:** Yes; resolve the range before retrieval
  and apply it to authorized meetings.
- **Additional work:** Store reliable meeting start times and define that
  “last meeting” means the latest meeting the caller attended and may read,
  unless a product decision changes this.

### Person, company, or campaign with a misspelling

- **Concerns:** An incorrectly typed or inflected name, company name, campaign
  code, or title.
- **Supported by the planned flow:** Yes; combine `pg_trgm` with semantic
  retrieval and ask for a choice when matches are ambiguous.
- **Additional work:** Maintain aliases and a small domain vocabulary if
  evaluation shows that embeddings and trigram matching miss recurring jargon.

### Statement by a specific person

- **Concerns:** “What did Bartek say about the budget?”
- **Supported by the planned flow:** Yes, when the speaker was manually mapped
  to that person; retrieve only segments associated with that mapping.
- **Additional work:** Do not infer a speaker from the participant list and
  report when unmapped speech was excluded.

### Last meeting without a named person

- **Concerns:** “What budget did we agree on at the last meeting?”
- **Supported by the planned flow:** Yes; use the latest authorized meeting in
  the caller's relevant meeting set and search only there.
- **Additional work:** Make the scope rule visible in the response by returning
  the selected meeting date and title.

### Comparison between two meetings

- **Concerns:** “By what percentage did client X reduce the campaign budget?”
- **Supported by the planned flow:** Not completely in the basic single-result
  flow, because the question requires two compatible values from different
  meetings.
- **Additional work:** Add a comparison plan that retrieves multiple meetings,
  extracts amount, currency, period, campaign, and date, pairs comparable
  values, calculates the percentage in application code, and cites both
  meetings.

### Time series

- **Concerns:** How a budget or decision changed across several meetings.
- **Supported by the planned flow:** Not completely in the basic single-result
  flow, because it must preserve multiple chronological values.
- **Additional work:** Add a series plan that returns ordered extracted values
  with one or more sources per value.

### Multiple explicitly named meetings

- **Concerns:** A question comparing or summarizing two or more specific
  meetings or dates.
- **Supported by the planned flow:** Partly; one scope resolver is insufficient
  for multiple independent ranges.
- **Additional work:** Allow a list of scopes and retrieve evidence separately
  for each before combining the answer.

### Multiple topics in one question

- **Concerns:** “What did we decide about the budget and who owns the creative?”
- **Supported by the planned flow:** Partly; one ranking may over-prioritize one
  topic.
- **Additional work:** Split the question into subqueries, retrieve each
  independently, and combine the validated results.

### List of all decisions or tasks

- **Concerns:** Every task or agreement in a defined meeting or time range.
- **Supported by the planned flow:** Not by a top-k answer flow, because a
  similarity ranking is not a complete result set.
- **Additional work:** Add a list plan with SQL filtering, pagination, stable
  ordering, and an explicit completeness guarantee.

### Count or aggregation

- **Concerns:** “How many meetings mentioned the budget?” or “How many tasks
  are overdue?”
- **Supported by the planned flow:** Not by top-k retrieval, because the
  answer requires the complete filtered set.
- **Additional work:** Add an aggregation plan using SQL or a validated
  structured extraction followed by code-side aggregation.

### Meeting metadata

- **Concerns:** Participants, meeting date, title, organizer, or whether a
  person attended.
- **Supported by the planned flow:** Not by transcript retrieval alone.
- **Additional work:** Add a metadata plan backed directly by authorized
  relational tables.

### Contradictory agreements

- **Concerns:** Different meetings contain incompatible budget values or
  decisions.
- **Supported by the planned flow:** Not reliably if only the highest-ranked
  result is retained.
- **Additional work:** retrieve all relevant structured decisions in the scope,
  detect incompatible values, and present both sources instead of silently
  choosing one.

### Follow-up question

- **Concerns:** “And how much was it before?” after a previous answer.
- **Supported by the planned flow:** Not without conversation state.
- **Additional work:** Persist or pass the previous validated query plan,
  entity, topic, and source scope into the next request.

### Exact quote or verification

- **Concerns:** Whether a particular phrase was said and where.
- **Supported by the planned flow:** Yes for retrieved evidence, with the exact
  text loaded from the transcript.
- **Additional work:** Mark whether a source is a raw transcript segment or a
  generated structured decision.

### Question outside the meeting domain

- **Concerns:** A question unrelated to meetings, transcripts, agreements, or
  tasks.
- **Supported by the planned flow:** Not without an explicit domain classifier.
- **Additional work:** Add an early unsupported-intent response and do not
  perform retrieval.

### Advice or recommendation

- **Concerns:** What the company should do rather than what was agreed.
- **Supported by the planned flow:** Not as a meeting-fact answer; unrestricted
  advice would exceed the evidence contract.
- **Additional work:** Either reject the request or define a separate,
  explicitly labeled advice mode with different product and safety rules.

### Task execution status

- **Concerns:** Whether an agreed task was actually completed.
- **Supported by the planned flow:** Not if the system only stores that the task
  was assigned.
- **Additional work:** Add a task-status source or integration; otherwise say
  that the system knows the agreement, not its completion state.

## 7. Edge cases and required behavior

- **No accessible meeting matches:** return no result without revealing whether
  an inaccessible meeting exists.
- **Ambiguous person or company:** ask the user to select a candidate and do
  not call the model.
- **No usable scope:** ask for a person, client, meeting, title, campaign, or
  time range and do not call the model.
- **No sufficiently similar evidence:** state that the available scope does not
  contain a supported answer instead of guessing.
- **Only one side of a comparison exists:** report the found value and ask for a
  second period or meeting.
- **Different currencies, periods, or campaigns:** do not calculate a
  comparison until the user clarifies or the records become comparable.
- **Zero baseline in a percentage calculation:** return the values without a
  percentage and explain that the percentage is undefined.
- **Unmapped speaker:** do not assign a person automatically and explicitly
  state that the evidence may be incomplete.
- **Conflicting values:** cite the conflicting meetings and ask which
  interpretation or period is intended.
- **Model returns a source it did not receive:** discard the reference and
  treat the answer as invalid.
- **Model output fails Zod validation twice:** return an error without storing
  or displaying an unvalidated answer.
- **Person name appears as an ordinary topic word:** do not resolve it to a
  speaker without a strong entity match and contextual evidence.
- **Numbers and codes:** preserve lexical retrieval alongside embeddings because
  exact numbers, campaign ids, and abbreviations are not reliably represented
  by semantic similarity alone.
- **Deleted or expired source:** return the structured result only if the
  source retention policy permits it; otherwise report that the source is no
  longer available.

## 8. Alternatives considered

### Search only structured summaries

This is cheaper and cleaner, but it misses exact quotes, qualifications, and
details that the summary omitted, so it is insufficient as the final design.

### Search only raw transcripts

This preserves recall and sources, but produces more noise and makes it easier
to select a casual statement instead of a confirmed agreement.

### Send the complete history to an LLM

This avoids a retrieval index for a small prototype, but it scales poorly,
costs more, makes details easier to miss, and cannot safely enforce access
control inside the prompt.

### Use Elasticsearch, Typesense, or a separate hosted search engine

These are viable if search becomes large or requires advanced autocomplete, but
they add a second data store, synchronization, operational cost, and another
authorization boundary without a clear benefit at the expected initial scale.

## 9. Verification plan for a later version

Before implementing the feature, prepare a non-confidential evaluation set with
questions and expected source records covering:

- Polish inflection, misspellings, and English marketing terms;
- exact amounts, currencies, percentages, campaign ids, and dates;
- single-meeting, multi-meeting, list, count, comparison, and follow-up
  questions;
- ambiguous names, missing scope, conflicting decisions, and unmapped speakers;
- users with different meeting permissions;
- attempts to retrieve inaccessible meetings or fabricate sources.

Measure retrieval recall, source precision, answer faithfulness, clarification
rate, unauthorized-result rate, latency, and cost per question. The
unauthorized-result rate must be zero before enabling the feature for real
client data.
