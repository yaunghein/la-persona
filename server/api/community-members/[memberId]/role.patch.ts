import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { auth } from '~~/server/auth';
import { db } from '~~/server/db';
import { member } from '~~/server/db/schema';
import { handleApiError } from '~~/server/utils/errors';
import { requireCommunityOrganization } from '~~/server/utils/organization-permissions';
import { requireOrganizationPermission } from '~~/server/utils/organization-permissions';
import {
  COMMUNITY_INVITE_ROLES,
  ORGANIZATION_PERMISSIONS,
  isOrganizationManagerRole,
} from '~~/shared/permissions/organization';
import { enrichLog } from '~~/server/utils/wide-event';

const bodySchema = z.object({
  role: z.enum(COMMUNITY_INVITE_ROLES),
});

export default defineEventHandler(async (event) => {
  const { org } = await requireCommunityOrganization(event);
  await requireOrganizationPermission(
    event,
    ORGANIZATION_PERMISSIONS.MEMBER_UPDATE
  );

  const memberId = getRouterParam(event, 'memberId');
  if (!memberId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Member id is required',
    });
  }

  const body = await readValidatedBody(event, bodySchema.safeParse);
  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: body.error.issues,
    });
  }

  enrichLog(event, {
    member: { id: memberId, organization_id: org.id, role: body.data.role },
  });

  try {
    const [target] = await db
      .select({ id: member.id, role: member.role })
      .from(member)
      .where(and(eq(member.id, memberId), eq(member.organizationId, org.id)))
      .limit(1);

    if (!target) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Member not found',
      });
    }

    if (isOrganizationManagerRole(target.role)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Owner and admin roles cannot be changed here',
      });
    }

    enrichLog(event, { member: { previous_role: target.role } });

    await auth.api.updateMemberRole({
      body: {
        memberId,
        role: body.data.role,
        organizationId: org.id,
      },
      headers: event.headers,
    });

    return { success: true, role: body.data.role };
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to update member role',
    });
  }
});
