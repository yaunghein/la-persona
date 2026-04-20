import { findCardsByUserIdAndOrganization } from '~~/server/db/queries/card';
import { and, eq } from 'drizzle-orm';
import { auth } from '~~/server/auth';
import { db } from '~~/server/db';
import { member, organization } from '~~/server/db/schema';

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const organizationSlug = getQuery(event).organizationSlug;
  const slug =
    typeof organizationSlug === 'string' ? organizationSlug.trim() : '';

  let organizationId = session.session.activeOrganizationId;
  if (slug) {
    const membership = await db
      .select({ organizationId: member.organizationId })
      .from(member)
      .innerJoin(organization, eq(organization.id, member.organizationId))
      .where(
        and(eq(member.userId, session.user.id), eq(organization.slug, slug))
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!membership) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
    }

    organizationId = membership.organizationId;
  }

  if (!organizationId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'No active organization selected.',
    });
  }

  return findCardsByUserIdAndOrganization(session.user.id, organizationId);
});
