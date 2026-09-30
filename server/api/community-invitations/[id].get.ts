import { and, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { invitation, member, organization } from '~~/server/db/schema';
import { getCommunityInviteStats } from '~~/server/services/community';
import { handleApiError } from '~~/server/utils/errors';
import { requireSession } from '~~/server/utils/organization-permissions';

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  const invitationId = getRouterParam(event, 'id');

  if (!invitationId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invitation id is required',
    });
  }

  try {
    const [invite] = await db
      .select()
      .from(invitation)
      .where(eq(invitation.id, invitationId))
      .limit(1);

    if (!invite) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Invitation not found',
      });
    }

    const org = await db.query.organization.findFirst({
      where: eq(organization.id, invite.organizationId),
      columns: { id: true, name: true, slug: true, logo: true },
    });

    if (!org) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Community not found',
      });
    }

    const [membership] = await db
      .select({ id: member.id })
      .from(member)
      .where(
        and(
          eq(member.userId, session.user.id),
          eq(member.organizationId, invite.organizationId)
        )
      )
      .limit(1);

    const stats = await getCommunityInviteStats(org.id);

    return {
      id: invite.id,
      email: invite.email,
      organizationName: org.name,
      organizationSlug: org.slug,
      logoUrl: org.logo,
      alreadyMember: Boolean(membership),
      expired: invite.expiresAt.getTime() < Date.now(),
      status: invite.status,
      ...stats,
    };
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to load invitation',
    });
  }
});
