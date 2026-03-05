import { z } from 'zod';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import {
  createSelectSchema,
  createInsertSchema,
  createUpdateSchema,
} from 'drizzle-zod';
import { card, cardUpdateRequest, cardRequest } from '~~/server/db/schema';

export type SelectCard = InferSelectModel<typeof card>;
export type InsertCard = InferInsertModel<typeof card>;
export type UpdateCard = Partial<InsertCard>;

export type CardDTO = Omit<SelectCard, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
  subscription?: {
    status: string;
    planCode: string | null;
    isTrial: boolean;
  } | null;
};

const socialLinkSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  value: z.url('Must be a valid URL'),
});

const cardBaseValidators = {
  email: z.string().email('Invalid email').optional().nullable(),
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

export type SelectCardRequest = InferSelectModel<typeof cardRequest>;
export type InsertCardRequest = InferInsertModel<typeof cardRequest>;
export type UpdateCardRequest = Partial<InsertCardRequest>;

export type CardRequestDTO = Omit<
  SelectCardRequest,
  'createdAt' | 'updatedAt'
> & {
  createdAt: string;
  updatedAt: string;
};

const cardRequestDataSchema = z.object({
  name: z.string().optional(),
  position: z.string().optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  socials: z.array(socialLinkSchema).optional(),
  sourceCardId: z.string().optional(),
});

export const cardRequestSelectSchema = createSelectSchema(cardRequest);

export const cardRequestInsertSchema = createInsertSchema(cardRequest, {
  cardData: cardRequestDataSchema,
  type: z.enum(['new_design', 'existing_design']),
  paymentReceiptUrl: z.string().trim().min(1, 'Payment receipt is required'),
}).omit({ userId: true });

export const cardRequestUpdateSchema = createUpdateSchema(cardRequest, {
  cardData: cardRequestDataSchema,
});
