import type { InferSelectModel } from 'drizzle-orm';
import { user, card, contactExchange } from '~~/server/db/schema';

export type User = InferSelectModel<typeof user>;

export type Card = InferSelectModel<typeof card>;
export type CardDTO = Omit<Card, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

export type ContactExchange = InferSelectModel<typeof contactExchange>;
export type ContactExchangeDTO = Omit<
  ContactExchange,
  'createdAt' | 'updatedAt'
> & {
  createdAt: string;
  updatedAt: string;
};
