import { z } from 'zod';

const demoEnvSchema = z.object({
  API_BASE_URL: z.string().min(1),
  ARTIFACTS_DIR: z.string().min(1),
  DEMO_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
  DEMO_UID: z.coerce.number().int().nonnegative().optional(),
  DEMO_GID: z.coerce.number().int().nonnegative().optional(),
});

export type DemoEnv = z.infer<typeof demoEnvSchema>;

const demoEnvKeys = [
  'API_BASE_URL',
  'ARTIFACTS_DIR',
  'DEMO_TIMEOUT_MS',
  'DEMO_UID',
  'DEMO_GID',
] as const;

export function loadDemoEnv(
  source: Record<string, string | undefined>,
): DemoEnv {
  const values: Record<string, string> = {};
  for (const key of demoEnvKeys) {
    const value = source[key];
    if (value !== undefined) {
      values[key] = value;
    }
  }

  const parsed = demoEnvSchema.safeParse(values);
  if (!parsed.success) {
    const fields = [
      ...new Set(parsed.error.issues.map((issue) => issue.path.join('.'))),
    ];
    throw new Error(`Invalid environment configuration: ${fields.join(', ')}`);
  }

  return parsed.data;
}
