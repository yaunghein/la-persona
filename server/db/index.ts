import { drizzle } from 'drizzle-orm/node-postgres';
import { useEnv } from '../utils/env';
import * as schema from './schema';

const env = useEnv();

export const db = drizzle({
  connection: {
    connectionString: env.DATABASE_URL,
    ssl: true,
  },
  casing: 'snake_case',
  schema,
});
