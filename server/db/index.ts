import { drizzle } from 'drizzle-orm/node-postgres';
import { env } from '../utils/env';
import * as schema from './schema';

export const db = drizzle({
  connection: {
    connectionString: env.DATABASE_URL,
  },
  casing: 'snake_case',
  schema,
});
