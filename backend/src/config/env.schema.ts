import { z } from 'zod';

const portSchema = z.coerce.number().int().min(1).max(65535);
const positiveInt = z.coerce.number().int().positive();
const nonNegativeInt = z.coerce.number().int().min(0);

const workerRuntimeKeys = [
  'WORKER_CONCURRENCY',
  'WORKER_LOCK_DURATION_MS',
  'WORKER_STALLED_INTERVAL_MS',
] as const;

const sharedEnvKeys = [
  ...workerRuntimeKeys,
  'DATABASE_URL',
  'REDIS_URL',
  'QUEUE_PREFIX',
  'WORKER_JOB_ATTEMPTS',
  'WORKER_JOB_BACKOFF_MS',
  'WORKER_STEP_TIMEOUT_MS',
] as const;

const apiEnvKeys = ['PORT', ...sharedEnvKeys] as const;

const workerRuntimeSchema = z.object({
  WORKER_CONCURRENCY: positiveInt.default(1),
  WORKER_LOCK_DURATION_MS: positiveInt.default(30_000),
  WORKER_STALLED_INTERVAL_MS: positiveInt.default(30_000),
});

const sharedEnvSchema = workerRuntimeSchema.extend({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  QUEUE_PREFIX: z.string().min(1).optional(),
  WORKER_JOB_ATTEMPTS: positiveInt.default(5),
  WORKER_JOB_BACKOFF_MS: nonNegativeInt.default(1_000),
  WORKER_STEP_TIMEOUT_MS: positiveInt.default(30_000),
});

export const envSchema = sharedEnvSchema.extend({
  PORT: portSchema,
});

export const workerEnvSchema = sharedEnvSchema;

export type Env = z.infer<typeof sharedEnvSchema> & { PORT?: number };
export type WorkerRuntime = z.infer<typeof workerRuntimeSchema>;

export function loadEnv(
  source: Record<string, string | undefined>,
): Env & { PORT: number } {
  return parseEnv(envSchema, source, apiEnvKeys);
}

export function loadWorkerEnv(
  source: Record<string, string | undefined>,
): Env {
  return parseEnv(workerEnvSchema, source, sharedEnvKeys);
}

export function loadWorkerRuntime(
  source: Record<string, string | undefined>,
): WorkerRuntime {
  return parseEnv(workerRuntimeSchema, source, workerRuntimeKeys);
}

function parseEnv<TSchema extends z.ZodType>(
  schema: TSchema,
  source: Record<string, string | undefined>,
  keys: readonly string[],
): z.infer<TSchema> {
  const parsed = schema.safeParse(presentValues(source, keys));
  if (!parsed.success) {
    const fields = [
      ...new Set(parsed.error.issues.map((issue) => issue.path.join('.'))),
    ];
    throw new Error(`Invalid environment configuration: ${fields.join(', ')}`);
  }

  return parsed.data;
}

function presentValues(
  source: Record<string, string | undefined>,
  keys: readonly string[],
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined) {
      values[key] = value;
    }
  }
  return values;
}
