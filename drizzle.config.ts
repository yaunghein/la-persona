import { defineConfig } from 'drizzle-kit';

// drizzle-kit runs outside Nuxt, so ArkEnv's Nitro boot gate never runs here.
// `bun run db:*` loads `.env`; fail fast with a clear message if it is missing.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required for drizzle-kit.');

export default defineConfig({
  out: './server/db/migrations',
  schema: './server/db/schema',
  dialect: 'postgresql',
  casing: 'snake_case',
  dbCredentials: {
    url: databaseUrl,
  },
});
