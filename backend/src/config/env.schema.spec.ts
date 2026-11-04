import { loadEnv, loadWorkerEnv, loadWorkerRuntime } from './env.schema.js';

const validSource = {
  PORT: '3000',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/vinseo',
  REDIS_URL: 'redis://localhost:6379',
};

const workerDefaults = {
  WORKER_JOB_ATTEMPTS: 5,
  WORKER_JOB_BACKOFF_MS: 1000,
  WORKER_STEP_TIMEOUT_MS: 30_000,
  WORKER_CONCURRENCY: 1,
  WORKER_LOCK_DURATION_MS: 30_000,
  WORKER_STALLED_INTERVAL_MS: 30_000,
};

describe('loadEnv', () => {
  it('returns the typed configuration when every required variable is set', () => {
    expect(loadEnv(validSource)).toEqual({
      PORT: 3000,
      DATABASE_URL: validSource.DATABASE_URL,
      REDIS_URL: validSource.REDIS_URL,
      ...workerDefaults,
    });
  });

  it('uses the worker defaults and a configured attempt count', () => {
    expect(
      loadEnv({
        ...validSource,
        WORKER_JOB_ATTEMPTS: '3',
        WORKER_JOB_BACKOFF_MS: '250',
        QUEUE_PREFIX: 'vinseo-e2e',
      }),
    ).toMatchObject({
      WORKER_JOB_ATTEMPTS: 3,
      WORKER_JOB_BACKOFF_MS: 250,
      QUEUE_PREFIX: 'vinseo-e2e',
      WORKER_STEP_TIMEOUT_MS: 30_000,
    });
  });

  it('names a missing variable and does not repeat other values', () => {
    expect(() =>
      loadEnv({
        PORT: '3000',
        REDIS_URL: validSource.REDIS_URL,
      }),
    ).toThrowError(/^Invalid environment configuration: DATABASE_URL$/);
  });

  it('names an invalid port and does not repeat connection strings', () => {
    expect(() =>
      loadEnv({
        ...validSource,
        PORT: '0',
      }),
    ).toThrowError(/^Invalid environment configuration: PORT$/);
  });

  it('rejects an attempt count that is not a positive integer', () => {
    expect(() =>
      loadEnv({
        ...validSource,
        WORKER_JOB_ATTEMPTS: '0',
      }),
    ).toThrowError(/^Invalid environment configuration: WORKER_JOB_ATTEMPTS$/);
  });
});

describe('loadWorkerEnv', () => {
  it('does not require PORT', () => {
    expect(loadWorkerEnv(validSource)).toEqual({
      DATABASE_URL: validSource.DATABASE_URL,
      REDIS_URL: validSource.REDIS_URL,
      ...workerDefaults,
    });
    expect(loadWorkerEnv(validSource)).not.toHaveProperty('PORT');
  });

  it('names a missing database url', () => {
    expect(() =>
      loadWorkerEnv({
        REDIS_URL: validSource.REDIS_URL,
      }),
    ).toThrowError(/^Invalid environment configuration: DATABASE_URL$/);
  });
});

describe('loadWorkerRuntime', () => {
  it('reads concurrency and lock timing with defaults', () => {
    expect(loadWorkerRuntime({})).toEqual({
      WORKER_CONCURRENCY: 1,
      WORKER_LOCK_DURATION_MS: 30_000,
      WORKER_STALLED_INTERVAL_MS: 30_000,
    });
    expect(
      loadWorkerRuntime({
        WORKER_CONCURRENCY: '4',
        WORKER_LOCK_DURATION_MS: '400',
        WORKER_STALLED_INTERVAL_MS: '400',
      }),
    ).toEqual({
      WORKER_CONCURRENCY: 4,
      WORKER_LOCK_DURATION_MS: 400,
      WORKER_STALLED_INTERVAL_MS: 400,
    });
  });
});
