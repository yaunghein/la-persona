import { relations } from 'drizzle-orm';
import { user } from './auth';
import { card } from './card';
import { contactExchange } from './contact-exchange';

export const userRelations = relations(user, ({ many }) => ({
  cards: many(card),
}));

export const cardRelations = relations(card, ({ one, many }) => ({
  user: one(user, {
    fields: [card.userId],
    references: [user.id],
  }),
  exchanges: many(contactExchange),
}));

export const contactExchangeRelations = relations(
  contactExchange,
  ({ one }) => ({
    card: one(card, {
      fields: [contactExchange.cardId],
      references: [card.id],
    }),
  })
);
