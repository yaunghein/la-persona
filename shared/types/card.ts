import { card, cardUpdateRequest } from '~~/server/db/schema';
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

export type SelectCardUpdateRequest = InferSelectModel<
  typeof cardUpdateRequest
>;
export type InsertCardUpdateRequest = InferInsertModel<
  typeof cardUpdateRequest
>;
export type UpdateCardUpdateRequest = Partial<InsertCardUpdateRequest>;

export type CardUpdateRequestDTO = Omit<
  SelectCardUpdateRequest,
  'createdAt' | 'updatedAt'
> & {
  createdAt: string;
  updatedAt: string;
};

export const cardUpdateRequestSelectSchema =
  createSelectSchema(cardUpdateRequest);
export const cardUpdateRequestInsertSchema = createInsertSchema(
  cardUpdateRequest
).omit({ requestedBy: true });
export const cardUpdateRequestUpdateSchema =
  createUpdateSchema(cardUpdateRequest);
