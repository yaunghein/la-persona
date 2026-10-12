import { eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { organization } from '~~/server/db/schema';
import { findCommunitySettingByInviteToken } from '~~/server/db/queries/community-setting';
import { getCommunityInviteStats } from '~~/server/services/community';
import { handleApiError } from '~~/server/utils/errors';
import { enrichLog } from '~~/server/utils/wide-event';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';
import type { CommunityJoinPublicPreview } from '~~/shared/types/community-members';

// No session: powers the join page for signed-out visitors and link previews.
export default defineEventHandler(async (event) => {
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

    enrichLog(event, { organization: { id: org.id } });

    const stats = await getCommunityInviteStats(org.id);

    const payload: CommunityJoinPublicPreview = {
      organizationName: org.name,
      organizationSlug: org.slug,
      logoUrl: org.logo,
      ...stats,
    };

    return payload;
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to load invite',
    });
  }
});
