import { z } from 'zod';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import {
  createSelectSchema,
  createInsertSchema,
  createUpdateSchema,
} from 'drizzle-zod';
import { card, cardUpdateRequest } from '~~/server/db/schema';

export type SelectCard = InferSelectModel<typeof card>;
export type InsertCard = InferInsertModel<typeof card>;
export type UpdateCard = Partial<InsertCard>;

export type CardDTO = Omit<SelectCard, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

const socialLinkSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  value: z.url('Must be a valid URL'),
});

const cardBaseValidators = {
  email: z.email('Invalid email').optional().nullable(),
  socials: z.array(socialLinkSchema).optional(),
};

export const cardSelectSchema = createSelectSchema(card);
export const cardInsertSchema = createInsertSchema(card, cardBaseValidators);
export const cardUpdateSchema = createUpdateSchema(card, cardBaseValidators);

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
