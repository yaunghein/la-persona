import { drizzle } from 'drizzle-orm/node-postgres';

const config = useRuntimeConfig();

export const db = drizzle({
  connection: {
    connectionString: config.databaseUrl,
    ssl: true,
  },
});
