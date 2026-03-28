import { desc, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { card, organization, user } from '~~/server/db/schema';
import { requireAdminSession } from '~~/server/utils/admin-permissions';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);

  return await db
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
      splineUrl: card.splineUrl,
      avatarUrl: card.avatarUrl,
      wallpaperUrl: card.wallpaperUrl,
      cardBackUrl: card.cardBackUrl,
      organizationId: card.organizationId,
      organizationName: organization.name,
      organizationSlug: organization.slug,
      userId: card.userId,
      linkedUserEmail: user.email,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    })
    .from(card)
    .innerJoin(organization, eq(organization.id, card.organizationId))
    .leftJoin(user, eq(user.id, card.userId))
    .orderBy(desc(card.updatedAt));
});
