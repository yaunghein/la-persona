import { z } from 'zod';

export const OnboardingInvitationRouteParams = z.object({
  invitationId: z.string().trim().min(1),
});

/** Thakhin hands an unclaimed card (with a free period) to someone by email. */
export const CreateOnboardingInvitationRequest = z.object({
  email: z.email().trim().toLowerCase(),
  organizationName: z.string().trim().min(2).max(120),
  cardId: z.string().trim().min(1),
  subscriptionPlanCode: z.string().trim().min(1),
  freeMonths: z.coerce.number().int().min(0).max(120),
  expirationMinutes: z.coerce.number().int().min(1).max(60 * 24 * 90),
  sendNow: z.coerce.boolean().default(false),
});

export type CreateOnboardingInvitationRequest = z.infer<
  typeof CreateOnboardingInvitationRequest
>;

export const CancelOnboardingInvitationRequest = z.object({
  status: z.literal('canceled'),
});

export const AcceptOnboardingInvitationRequest = z.object({
  status: z.literal('accepted'),
});

export const ListMyOnboardingInvitationsQuery = z.object({
  status: z.literal('pending').default('pending'),
});

export type OnboardingInvitationSummary = {
  id: string;
  email: string;
  status: string;
  freeMonths: number;
  expirationMinutes: number;
  expiresAt: string;
  acceptedAt: string | null;
  resendCount: number;
  lastSentAt: string | null;
  createdAt: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  cardId: string;
  cardFirstName: string;
  cardLastName: string | null;
  planCode: string;
  planName: string;
  link: string;
};

/** What the invitee sees before accepting. */
export type OnboardingInvitationPreview = {
  id: string;
  email: string;
  status: string;
  freeMonths: number;
  expiresAt: string;
  acceptedAt: string | null;
  organizationName: string;
  organizationSlug: string;
  cardSlug: string;
  cardFirstName: string;
  cardLastName: string | null;
  planName: string;
  isExpired: boolean;
  isEmailMatched: boolean;
  canAccept: boolean;
};
