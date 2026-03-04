import { relations } from 'drizzle-orm';
import { member, organization, user } from './auth';
import { card } from './card';
import { contactExchange } from './contact-exchange';
import { cardSubscription } from './card-subscription';
import { subscriptionPayment, subscriptionPaymentItem } from './subscription-payment';
import { subscriptionPlan } from './subscription-plan';

export const userRelations = relations(user, ({ many }) => ({
  cards: many(card),
  submittedSubscriptionPayments: many(subscriptionPayment),
}));

export const organizationSubscriptionRelations = relations(
  organization,
  ({ many }) => ({
    subscriptionPayments: many(subscriptionPayment),
  })
);

export const memberSubscriptionRelations = relations(member, ({ one }) => ({
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [member.userId],
    references: [user.id],
  }),
}));

export const cardRelations = relations(card, ({ one, many }) => ({
  user: one(user, {
    fields: [card.userId],
    references: [user.id],
  }),
  exchanges: many(contactExchange),
  subscription: one(cardSubscription, {
    fields: [card.id],
    references: [cardSubscription.cardId],
  }),
  subscriptionPaymentItems: many(subscriptionPaymentItem),
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

export const subscriptionPlanRelations = relations(subscriptionPlan, ({ many }) => ({
  cardSubscriptions: many(cardSubscription),
}));

export const subscriptionPaymentRelations = relations(
  subscriptionPayment,
  ({ one, many }) => ({
    organization: one(organization, {
      fields: [subscriptionPayment.organizationId],
      references: [organization.id],
    }),
    paidByUser: one(user, {
      fields: [subscriptionPayment.paidByUserId],
      references: [user.id],
    }),
    items: many(subscriptionPaymentItem),
  })
);

export const subscriptionPaymentItemRelations = relations(
  subscriptionPaymentItem,
  ({ one }) => ({
    payment: one(subscriptionPayment, {
      fields: [subscriptionPaymentItem.paymentId],
      references: [subscriptionPayment.id],
    }),
    card: one(card, {
      fields: [subscriptionPaymentItem.cardId],
      references: [card.id],
    }),
    cardSubscription: one(cardSubscription, {
      fields: [subscriptionPaymentItem.id],
      references: [cardSubscription.lastPaymentItemId],
    }),
  })
);

export const cardSubscriptionRelations = relations(cardSubscription, ({ one }) => ({
  card: one(card, {
    fields: [cardSubscription.cardId],
    references: [card.id],
  }),
  lastPaymentItem: one(subscriptionPaymentItem, {
    fields: [cardSubscription.lastPaymentItemId],
    references: [subscriptionPaymentItem.id],
  }),
  plan: one(subscriptionPlan, {
    fields: [cardSubscription.planCode],
    references: [subscriptionPlan.code],
  }),
}));
