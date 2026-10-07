import { z } from 'zod';
import { auth } from '~~/server/auth';
import { handleApiError } from '~~/server/utils/errors';
import { requireCommunityOrganization } from '~~/server/utils/organization-permissions';
import { requireOrganizationPermission } from '~~/server/utils/organization-permissions';
import { ORGANIZATION_PERMISSIONS } from '~~/shared/permissions/organization';
import { enrichLog } from '~~/server/utils/wide-event';

const bodySchema = z.object({
  email: z.string().trim().email('A valid email is required'),
});

export default defineEventHandler(async (event) => {
  const { org } = await requireCommunityOrganization(event);
  await requireOrganizationPermission(
    event,
    ORGANIZATION_PERMISSIONS.INVITATION_CREATE
  );

  const body = await readValidatedBody(event, bodySchema.safeParse);
  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: body.error.issues,
    });
  }

  enrichLog(event, {
    invitation: {
      organization_id: org.id,
      email: body.data.email.toLowerCase(),
    },
  });

  try {
    const invitation = await auth.api.createInvitation({
      body: {
        email: body.data.email.toLowerCase(),
        role: 'member',
        organizationId: org.id,
        resend: true,
      },
      headers: event.headers,
    });

    enrichLog(event, {
      invitation: { id: invitation.id },
    });

    return invitation;
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to send invitation',
    });
  }
});
