import { card } from '~~/server/db/schema';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import {
  createSelectSchema,
  createInsertSchema,
  createUpdateSchema,
} from 'drizzle-zod';

export type SelectCard = InferSelectModel<typeof card>;
export type InsertCard = InferInsertModel<typeof card>;
export type UpdateCard = Partial<InsertCard>;

export type CardDTO = Omit<SelectCard, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

export const cardSelectSchema = createSelectSchema(card);
export const cardInsertSchema = createInsertSchema(card);
export const cardUpdateSchema = createUpdateSchema(card);
