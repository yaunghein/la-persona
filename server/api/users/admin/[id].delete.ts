import { eq } from 'drizzle-orm';
import { auth } from '~~/server/auth';
import { db } from '~~/server/db';
import { user } from '~~/server/db/schema';
import { deletePersonalOrganizationsForUser } from '~~/server/services/auth';
import { requireAdminSession } from '~~/server/utils/admin-permissions';
import { handleApiError } from '~~/server/utils/errors';

export default defineEventHandler(async (event) => {
  const adminSession = await requireAdminSession(event);
  const userId = getRouterParam(event, 'id');

  if (!userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'User id is required',
    });
  }

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

    const deletedOrganizationIds =
      await deletePersonalOrganizationsForUser(userId);

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
