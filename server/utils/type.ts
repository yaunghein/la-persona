import type { InferSelectModel } from 'drizzle-orm';
import { user, card } from '../db/schema';

export type User = InferSelectModel<typeof user>;
export type Card = InferSelectModel<typeof card>;
