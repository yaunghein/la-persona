import { and, eq } from 'drizzle-orm';
import { auth } from '~~/server/auth';
import { db } from '~~/server/db';
import { invitation, user } from '~~/server/db/schema';
import { addCommunityMember } from '~~/server/services/community';
import { handleApiError } from '~~/server/utils/errors';
import { requireCommunityOrganization } from '~~/server/utils/organization-permissions';
import { requireOrganizationPermission } from '~~/server/utils/organization-permissions';
import { ORGANIZATION_PERMISSIONS } from '~~/shared/permissions/organization';
import { enrichLog } from '~~/server/utils/wide-event';

export default defineEventHandler(async (event) => {
  const { org } = await requireCommunityOrganization(event);
  await requireOrganizationPermission(
    event,
    ORGANIZATION_PERMISSIONS.MEMBER_CREATE
  );

  const invitationId = getRouterParam(event, 'id');
  if (!invitationId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invitation id is required',
    });
  }
  enrichLog(event, { invitation: { id: invitationId, organization_id: org.id } });

  try {
    const [invite] = await db
      .select()
      .from(invitation)
      .where(
        and(
          eq(invitation.id, invitationId),
          eq(invitation.organizationId, org.id)
        )
      )
      .limit(1);

    if (!invite || invite.status !== 'pending') {
      throw createError({
        statusCode: 404,
        statusMessage: 'Invitation not found',
      });
    }
    enrichLog(event, { invitation: { email: invite.email } });

    const account = await db.query.user.findFirst({
      where: eq(user.email, invite.email),
      columns: { id: true },
    });

    if (account) {
      await addCommunityMember(account.id, org.id);
      await auth.api.cancelInvitation({
        body: { invitationId },
        headers: event.headers,
      });
      enrichLog(event, { invitation: { result: 'added' } });
      return { success: true, added: true };
    }

    await auth.api.createInvitation({
      body: {
        email: invite.email,
        role: 'member',
        organizationId: org.id,
        resend: true,
      },
      headers: event.headers,
    });

    enrichLog(event, { invitation: { result: 'resent' } });
    return { success: true, added: false, resent: true };
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to approve invitation',
    });
  }
});
