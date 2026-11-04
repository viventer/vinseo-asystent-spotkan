import { z } from 'zod';

const portSchema = z.coerce.number().int().min(1).max(65535);

export const envSchema = z.object({
  PORT: portSchema,
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: Record<string, string | undefined>): Env {
  const parsed = envSchema.safeParse({
    PORT: source.PORT,
    DATABASE_URL: source.DATABASE_URL,
    REDIS_URL: source.REDIS_URL,
  });

  if (!parsed.success) {
    const fields = [
      ...new Set(parsed.error.issues.map((issue) => issue.path.join('.'))),
    ];
    throw new Error(`Invalid environment configuration: ${fields.join(', ')}`);
  }

  return parsed.data;
}
