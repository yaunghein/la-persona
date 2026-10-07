import { removeCommunityMember } from '~~/server/services/community';
import { handleApiError } from '~~/server/utils/errors';
import { requireCommunityOrganization } from '~~/server/utils/organization-permissions';
import { requireOrganizationPermission } from '~~/server/utils/organization-permissions';
import { ORGANIZATION_PERMISSIONS } from '~~/shared/permissions/organization';
import { enrichLog } from '~~/server/utils/wide-event';

export default defineEventHandler(async (event) => {
  const { org } = await requireCommunityOrganization(event);
  await requireOrganizationPermission(
    event,
    ORGANIZATION_PERMISSIONS.MEMBER_DELETE
  );

  const memberId = getRouterParam(event, 'memberId');
  if (!memberId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Member id is required',
    });
  }
  enrichLog(event, { member: { id: memberId, organization_id: org.id } });

  try {
    await removeCommunityMember({
      memberId,
      organizationId: org.id,
    });

    return { success: true };
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to remove member',
    });
  }
});
