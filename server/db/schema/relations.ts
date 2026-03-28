import { relations } from 'drizzle-orm';
import { member, organization, user } from './auth';
import { card } from './card';
import { contactExchange } from './contact-exchange';
import { cardSubscription } from './card-subscription';
import { subscriptionPayment, subscriptionPaymentItem } from './subscription-payment';
import { subscriptionPlan } from './subscription-plan';
import { cardRequest } from './card-request';
import { feedbackSubmission } from './feedback-submission';
import { onboardingInvitation } from './onboarding-invitation';

export const userRelations = relations(user, ({ many }) => ({
  cards: many(card),
  submittedSubscriptionPayments: many(subscriptionPayment),
  feedbackSubmissions: many(feedbackSubmission),
  createdOnboardingInvitations: many(onboardingInvitation, {
    relationName: 'onboarding_invitation_created_by',
  }),
  acceptedOnboardingInvitations: many(onboardingInvitation, {
    relationName: 'onboarding_invitation_accepted_by',
  }),
}));

export const organizationSubscriptionRelations = relations(
  organization,
  ({ many }) => ({
    subscriptionPayments: many(subscriptionPayment),
    feedbackSubmissions: many(feedbackSubmission),
    onboardingInvitations: many(onboardingInvitation),
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
  onboardingInvitations: many(onboardingInvitation),
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
  onboardingInvitations: many(onboardingInvitation),
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
    request: one(cardRequest, {
      fields: [subscriptionPayment.requestId],
      references: [cardRequest.id],
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

export const feedbackSubmissionRelations = relations(
  feedbackSubmission,
  ({ one }) => ({
    organization: one(organization, {
      fields: [feedbackSubmission.organizationId],
      references: [organization.id],
    }),
    user: one(user, {
      fields: [feedbackSubmission.userId],
      references: [user.id],
    }),
  })
);

export const onboardingInvitationRelations = relations(
  onboardingInvitation,
  ({ one }) => ({
    organization: one(organization, {
      fields: [onboardingInvitation.organizationId],
      references: [organization.id],
    }),
    card: one(card, {
      fields: [onboardingInvitation.cardId],
      references: [card.id],
    }),
    subscriptionPlan: one(subscriptionPlan, {
      fields: [onboardingInvitation.subscriptionPlanCode],
      references: [subscriptionPlan.code],
    }),
    createdByUser: one(user, {
      fields: [onboardingInvitation.createdByUserId],
      references: [user.id],
      relationName: 'onboarding_invitation_created_by',
    }),
    acceptedByUser: one(user, {
      fields: [onboardingInvitation.acceptedByUserId],
      references: [user.id],
      relationName: 'onboarding_invitation_accepted_by',
    }),
  })
);
