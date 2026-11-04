import { defineConfig } from 'drizzle-kit';

const dockerComposeDatabaseUrl =
  'postgresql://postgres:postgres@localhost:5432/vinseo';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/**/*.table.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? dockerComposeDatabaseUrl,
  },
});
