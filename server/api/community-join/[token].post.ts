import { and, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { member, organization } from '~~/server/db/schema';
import { findCommunitySettingByInviteToken } from '~~/server/db/queries/community-setting';
import {
  addCommunityMember,
  communityRedirectPath,
} from '~~/server/services/community';
import { handleApiError } from '~~/server/utils/errors';
import { requireSession } from '~~/server/utils/organization-permissions';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';
import { enrichLog } from '~~/server/utils/wide-event';

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
    enrichLog(event, {
      invitation: { organization_id: setting.organizationId },
    });

    const org = await db.query.organization.findFirst({
      where: eq(organization.id, setting.organizationId),
      columns: { id: true, slug: true, type: true },
    });

    if (!org || org.type !== ORGANIZATION_TYPES.COMMUNITY) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Community not found',
      });
    }
    enrichLog(event, { invitation: { organization_slug: org.slug } });

    await addCommunityMember(session.user.id, org.id);

    const [membership] = await db
      .select({ role: member.role })
      .from(member)
      .where(
        and(eq(member.userId, session.user.id), eq(member.organizationId, org.id))
      )
      .limit(1);

    return {
      organizationSlug: org.slug,
      redirectTo: communityRedirectPath({
        organizationSlug: org.slug,
        role: membership?.role,
      }),
    };
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to join community',
    });
  }
});
