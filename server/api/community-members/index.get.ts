import { ensureCommunitySetting } from '~~/server/db/queries/community-setting';
import { listCommunityRoster, communityInviteLink } from '~~/server/services/community';
import { handleApiError } from '~~/server/utils/errors';
import {
  requireCommunityOrganization,
  requireOrganizationPermission,
} from '~~/server/utils/organization-permissions';
import { ORGANIZATION_PERMISSIONS } from '~~/shared/permissions/organization';

export default defineEventHandler(async (event) => {
  const { org } = await requireCommunityOrganization(event);
  await requireOrganizationPermission(
    event,
    ORGANIZATION_PERMISSIONS.MEMBER_CREATE
  );

  try {
    const setting = await ensureCommunitySetting(org.id);
    const members = await listCommunityRoster(org.id);

    return {
      inviteLink: setting?.inviteToken
        ? communityInviteLink(setting.inviteToken)
        : '',
      members,
    };
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to load community members',
    });
  }
});
