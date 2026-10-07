import { and, eq, gt } from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  card,
  cardSubscription,
  onboardingInvitation,
  organization,
  user,
} from '~~/server/db/schema';
import { requireAdminSession } from '~~/server/utils/admin-permissions';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const cardId = getRouterParam(event, 'id');
  if (!cardId) {
    throw createError({ statusCode: 400, statusMessage: 'Card id is required' });
  }

  const [row] = await db
    .select({
      id: card.id,
      slug: card.slug,
      firstName: card.firstName,
      lastName: card.lastName,
      position: card.position,
      company: card.company,
      phone: card.phone,
      email: card.email,
      website: card.website,
      organizationId: card.organizationId,
      organizationName: organization.name,
      organizationSlug: organization.slug,
      userId: card.userId,
      linkedUserEmail: user.email,
      subscriptionStatus: cardSubscription.status,
      subscriptionPlanCode: cardSubscription.planCode,
      createdAt: card.createdAt,
    })
    .from(card)
    .innerJoin(organization, eq(organization.id, card.organizationId))
    .leftJoin(user, eq(user.id, card.userId))
    .leftJoin(cardSubscription, eq(cardSubscription.cardId, card.id))
    .where(eq(card.id, cardId))
    .limit(1);

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'Card not found' });
  }

  const pendingInvitation = await db.query.onboardingInvitation.findFirst({
    where: and(
      eq(onboardingInvitation.cardId, cardId),
      eq(onboardingInvitation.status, 'pending'),
      gt(onboardingInvitation.expiresAt, new Date())
    ),
    columns: { id: true, email: true, expiresAt: true },
  });

  return { ...row, pendingInvitation: pendingInvitation ?? null };
});
