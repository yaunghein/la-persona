import { and, eq } from 'drizzle-orm';
import { auth } from '~~/server/auth';
import { db } from '~~/server/db';
import { member, organization, user } from '~~/server/db/schema';
import { deletePersonalOrganizationsForUser } from '~~/server/services/auth';
import { requireAdminSession } from '~~/server/utils/admin-permissions';
import { handleApiError } from '~~/server/utils/errors';
import { enrichLog } from '~~/server/utils/wide-event';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

export default defineEventHandler(async (event) => {
  const adminSession = await requireAdminSession(event);
  const userId = getRouterParam(event, 'id');

  if (!userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'User id is required',
    });
  }
  enrichLog(event, { target_user: { id: userId } });

  if (userId === adminSession.user.id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'You cannot delete your own account',
    });
  }

  try {
    const existing = await db.query.user.findFirst({
      where: eq(user.id, userId),
      columns: { id: true, email: true, name: true },
    });
    if (!existing) {
      throw createError({ statusCode: 404, statusMessage: 'User not found' });
    }
    enrichLog(event, { target_user: { email: existing.email } });

    const communityMemberships = await db
      .select({ organizationId: member.organizationId })
      .from(member)
      .innerJoin(organization, eq(organization.id, member.organizationId))
      .where(
        and(
          eq(member.userId, userId),
          eq(organization.type, ORGANIZATION_TYPES.COMMUNITY)
        )
      );

    const deletedOrganizationIds =
      await deletePersonalOrganizationsForUser(userId);

    enrichLog(event, {
      target_user: {
        deleted_organization_ids: deletedOrganizationIds,
        community_organization_ids: communityMemberships.map(
          (row) => row.organizationId
        ),
      },
    });

    await auth.api.removeUser({
      body: { userId },
      headers: event.headers,
    });

    return {
      id: existing.id,
      email: existing.email,
      name: existing.name,
      deletedOrganizationIds,
    };
  } catch (error) {
    handleApiError(error, { statusMessage: 'Failed to delete user' });
  }
});
