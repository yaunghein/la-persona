import { eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  onboardingInvitation,
  organization,
  card,
  subscriptionPlan,
} from '~~/server/db/schema';
import { auth } from '~~/server/auth';
import { normalizeEmail } from '~~/server/services/onboarding-invitation';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Invitation id is required' });
  }

  const invitation = await db
    .select({
      id: onboardingInvitation.id,
      email: onboardingInvitation.email,
      status: onboardingInvitation.status,
      freeMonths: onboardingInvitation.freeMonths,
      expiresAt: onboardingInvitation.expiresAt,
      acceptedAt: onboardingInvitation.acceptedAt,
      organizationName: organization.name,
      organizationSlug: organization.slug,
      cardFirstName: card.firstName,
      cardLastName: card.lastName,
      planName: subscriptionPlan.name,
    })
    .from(onboardingInvitation)
    .innerJoin(organization, eq(organization.id, onboardingInvitation.organizationId))
    .innerJoin(card, eq(card.id, onboardingInvitation.cardId))
    .innerJoin(
      subscriptionPlan,
      eq(subscriptionPlan.code, onboardingInvitation.subscriptionPlanCode)
    )
    .where(eq(onboardingInvitation.id, id))
    .then((rows) => rows[0]);

  if (!invitation) {
    throw createError({ statusCode: 404, statusMessage: 'Invitation not found' });
  }

  const now = new Date();
  const isExpired = invitation.expiresAt <= now;

  const session = await auth.api.getSession({ headers: event.headers });
  const isEmailMatched = session
    ? normalizeEmail(session.user.email) === normalizeEmail(invitation.email)
    : null;

  return {
    ...invitation,
    isExpired,
    canAccept:
      invitation.status === 'pending' &&
      !isExpired &&
      (isEmailMatched === true || isEmailMatched === null),
    isEmailMatched,
  };
});
