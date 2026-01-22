import {
  contactExchange,
  contactExchangeBeforePlatform,
} from '~~/server/db/schema';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import {
  createSelectSchema,
  createInsertSchema,
  createUpdateSchema,
} from 'drizzle-zod';

export type SelectContactExchange = InferSelectModel<typeof contactExchange>;
export type InsertContactExchange = InferInsertModel<typeof contactExchange>;
export type UpdateContactExchange = Partial<InsertContactExchange>;
export type ContactExchangeDTO = Omit<
  SelectContactExchange,
  'createdAt' | 'updatedAt'
> & {
  createdAt: string;
  updatedAt: string;
};

export const contactExchangeSelectSchema = createSelectSchema(contactExchange);
export const contactExchangeInsertSchema = createInsertSchema(contactExchange);
export const contactExchangeUpdateSchema = createUpdateSchema(contactExchange);

export type SelectLegacyExchange = InferSelectModel<
  typeof contactExchangeBeforePlatform
>;
export type InsertLegacyExchange = InferInsertModel<
  typeof contactExchangeBeforePlatform
>;
export type UpdateLegacyExchange = Partial<InsertLegacyExchange>;
export type LegacyExchangeDTO = Omit<
  SelectLegacyExchange,
  'createdAt' | 'updatedAt'
> & {
  createdAt: string;
  updatedAt: string;
};

export const legacyExchangeSelectSchema = createSelectSchema(
  contactExchangeBeforePlatform
);
export const legacyExchangeInsertSchema = createInsertSchema(
  contactExchangeBeforePlatform
);
export const legacyExchangeUpdateSchema = createUpdateSchema(
  contactExchangeBeforePlatform
);
