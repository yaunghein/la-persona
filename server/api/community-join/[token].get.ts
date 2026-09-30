import { and, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { member, organization } from '~~/server/db/schema';
import { findCommunitySettingByInviteToken } from '~~/server/db/queries/community-setting';
import { getCommunityInviteStats } from '~~/server/services/community';
import { handleApiError } from '~~/server/utils/errors';
import { requireSession } from '~~/server/utils/organization-permissions';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  const token = getRouterParam(event, 'token');

  if (!token) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invite token is required',
    });
  }

  try {
    const setting = await findCommunitySettingByInviteToken(token);
    if (!setting) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Invite link is invalid',
      });
    }

    const org = await db.query.organization.findFirst({
      where: eq(organization.id, setting.organizationId),
      columns: { id: true, name: true, slug: true, logo: true, type: true },
    });

    if (!org || org.type !== ORGANIZATION_TYPES.COMMUNITY) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Community not found',
      });
    }

    const [membership] = await db
      .select({ id: member.id })
      .from(member)
      .where(
        and(eq(member.userId, session.user.id), eq(member.organizationId, org.id))
      )
      .limit(1);

    const stats = await getCommunityInviteStats(org.id);

    return {
      token,
      organizationName: org.name,
      organizationSlug: org.slug,
      logoUrl: org.logo,
      alreadyMember: Boolean(membership),
      ...stats,
    };
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to load invite',
    });
  }
});
