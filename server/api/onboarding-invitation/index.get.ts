import { desc, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  onboardingInvitation,
  organization,
  card,
  subscriptionPlan,
} from '~~/server/db/schema';
import { requireAdminSession } from '~~/server/utils/admin-permissions';
import { buildOnboardingInvitationLink } from '~~/server/services/onboarding-invitation';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);

  const rows = await db
    .select({
      id: onboardingInvitation.id,
      email: onboardingInvitation.email,
      status: onboardingInvitation.status,
      freeMonths: onboardingInvitation.freeMonths,
      expirationMinutes: onboardingInvitation.expirationMinutes,
      expiresAt: onboardingInvitation.expiresAt,
      acceptedAt: onboardingInvitation.acceptedAt,
      resendCount: onboardingInvitation.resendCount,
      lastSentAt: onboardingInvitation.lastSentAt,
      createdAt: onboardingInvitation.createdAt,
      organizationId: onboardingInvitation.organizationId,
      organizationName: organization.name,
      organizationSlug: organization.slug,
      cardId: onboardingInvitation.cardId,
      cardFirstName: card.firstName,
      cardLastName: card.lastName,
      planCode: onboardingInvitation.subscriptionPlanCode,
      planName: subscriptionPlan.name,
    })
    .from(onboardingInvitation)
    .innerJoin(organization, eq(organization.id, onboardingInvitation.organizationId))
    .innerJoin(card, eq(card.id, onboardingInvitation.cardId))
    .innerJoin(
      subscriptionPlan,
      eq(subscriptionPlan.code, onboardingInvitation.subscriptionPlanCode)
    )
    .orderBy(desc(onboardingInvitation.createdAt));

  return rows.map((row) => ({
    ...row,
    link: buildOnboardingInvitationLink(row.id),
  }));
});
