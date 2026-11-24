// Playwright's webServer command. Playwright starts web servers before globalSetup
// and stops them after globalTeardown, so the services live here instead: removing
// Postgres while the app still holds pool connections crashes it on the way out.
import { execSync, spawn } from 'node:child_process';
import pg from 'pg';

const compose = 'docker compose -f tests/docker-compose.yml';

execSync(`${compose} up -d --wait`, { stdio: 'inherit' });
execSync('bunx drizzle-kit migrate', { stdio: 'inherit' });

// Company cards need the standard plan; real environments got it from db:backfill-subscriptions.
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
await db.query(
  `insert into subscription_plan (id, code, name, price_minor) values ('plan-standard', 'standard', 'Standard', 50000)
   on conflict (code) do nothing`
);
await db.end();

const [command, ...args] = process.argv.slice(2);
const server = spawn(command!, args, { stdio: 'inherit' });

// The stop signal reaches the whole process group; wait for the server to exit
// before removing the services.
process.on('SIGTERM', () => {});
process.on('SIGINT', () => {});

server.on('exit', (code) => {
  if (!process.env.KEEP_SERVICES) {
    execSync(`${compose} down`, { stdio: 'inherit' });
  }
  process.exit(code ?? 0);
});
