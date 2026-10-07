import { and, eq } from 'drizzle-orm';
import { auth } from '~~/server/auth';
import { db } from '~~/server/db';
import { invitation, member, organization } from '~~/server/db/schema';
import {
  communityRedirectPath,
  ensureCommunityCard,
} from '~~/server/services/community';
import { handleApiError } from '~~/server/utils/errors';
import { requireSession } from '~~/server/utils/organization-permissions';
import { enrichLog } from '~~/server/utils/wide-event';

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

    enrichLog(event, {
      invitation: {
        id: invite.id,
        organization_id: invite.organizationId,
        email: invite.email,
      },
    });

    if (invite.email.toLowerCase() !== session.user.email.toLowerCase()) {
      throw createError({
        statusCode: 403,
        statusMessage: 'This invitation was sent to a different email address',
      });
    }

    const org = await db.query.organization.findFirst({
      where: eq(organization.id, invite.organizationId),
      columns: { id: true, slug: true },
    });

    if (!org) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Community not found',
      });
    }

    const [membership] = await db
      .select({ role: member.role })
      .from(member)
      .where(
        and(
          eq(member.userId, session.user.id),
          eq(member.organizationId, org.id)
        )
      )
      .limit(1);

    if (
      !membership &&
      invite.status === 'pending' &&
      invite.expiresAt.getTime() >= Date.now()
    ) {
      await auth.api.acceptInvitation({
        body: { invitationId },
        headers: event.headers,
      });
    }

    await ensureCommunityCard(session.user.id, org.id);

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
      statusMessage: 'Failed to accept invitation',
    });
  }
});
