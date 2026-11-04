process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5432/vinseo_test';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.QUEUE_PREFIX = 'vinseo-e2e';
process.env.WORKER_JOB_ATTEMPTS = '5';
process.env.WORKER_JOB_BACKOFF_MS = '20';
process.env.WORKER_STEP_TIMEOUT_MS = '8000';
process.env.WORKER_CONCURRENCY = '1';
process.env.WORKER_LOCK_DURATION_MS = '400';
process.env.WORKER_STALLED_INTERVAL_MS = '200';
