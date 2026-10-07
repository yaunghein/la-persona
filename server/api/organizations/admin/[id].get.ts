import { eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { card, member, organization, user } from '~~/server/db/schema';
import { findCommunitySettingByOrganizationId } from '~~/server/db/queries/community-setting';
import { requireAdminSession } from '~~/server/utils/admin-permissions';
import { toCommunitySettingsDTO } from '~~/shared/types/community-settings';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const organizationId = getRouterParam(event, 'id');
  if (!organizationId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Organization id is required',
    });
  }

  const existing = await db.query.organization.findFirst({
    where: eq(organization.id, organizationId),
  });
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Organization not found' });
  }

  const [members, cards, setting] = await Promise.all([
    db
      .select({
        id: member.id,
        role: member.role,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
      })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(eq(member.organizationId, organizationId)),
    db
      .select({
        id: card.id,
        slug: card.slug,
        firstName: card.firstName,
        lastName: card.lastName,
        userId: card.userId,
      })
      .from(card)
      .where(eq(card.organizationId, organizationId)),
    existing.type === ORGANIZATION_TYPES.COMMUNITY
      ? findCommunitySettingByOrganizationId(organizationId)
      : Promise.resolve(null),
  ]);

  return {
    ...existing,
    members,
    cards,
    community:
      existing.type === ORGANIZATION_TYPES.COMMUNITY
        ? toCommunitySettingsDTO({
            name: existing.name,
            logo: existing.logo,
            coverUrl: setting?.coverUrl,
            description: setting?.description,
            guidelines: setting?.guidelines,
            whyJoin: setting?.whyJoin,
            splineUrl: setting?.splineUrl,
            wallpaperUrl: setting?.wallpaperUrl,
            cardBackUrl: setting?.cardBackUrl,
          })
        : null,
  };
});
