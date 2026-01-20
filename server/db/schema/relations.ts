import { relations } from 'drizzle-orm';
import { user } from './auth';
import { card } from './card';
import { contactExchange } from './contact-exchange';
import { invitation } from './invitation';

export const userRelations = relations(user, ({ many }) => ({
  cards: many(card),
}));

export const cardRelations = relations(card, ({ one, many }) => ({
  user: one(user, {
    fields: [card.userId],
    references: [user.id],
  }),
  exchanges: many(contactExchange),
  invitations: many(invitation),
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

export const invitationRelations = relations(invitation, ({ one }) => ({
  card: one(card, {
    fields: [invitation.cardId],
    references: [card.id],
  }),
}));
