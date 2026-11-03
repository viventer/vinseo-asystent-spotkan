# Environments

- Use separate local, test, staging, and production environments.
- Use Docker Compose locally for the API, workers, PostgreSQL, and Redis.
- Use synthetic data, fixtures, and fake providers in local and automated tests.
- Keep recording, transcription, and LLM providers behind replaceable
  adapters.
- Test idempotency, retries, recovery, validation, deletion, consent, and
  server-side authorization without real company data.
- Use separate databases, queues, storage, credentials, provider projects, and
  webhooks in non-production environments.
- Run provider integration tests only with minimal synthetic audio or text.
- Validate staging with synthetic recordings and purpose-recorded fictional
  meetings.
- Introduce real meetings only in a small, explicitly approved pilot after
  privacy and security controls are verified.
- Require participant consent and exclude confidential, client, HR, management,
  legal, and financial meetings from the initial pilot.
- Do not copy production recordings or databases into development, test, or
  staging.
