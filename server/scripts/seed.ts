import { seed } from 'drizzle-seed';
import { db } from '../db';
import * as schema from '../db/schema';

// TODO: need to fine tune seeder

async function main() {
  await seed(db, schema);
}

main();
