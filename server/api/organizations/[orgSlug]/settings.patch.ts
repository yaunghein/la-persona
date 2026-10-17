import { authorizeCommunityAccess } from '~~/server/features/organization/organization.policy';
import { updateCommunitySettings } from '~~/server/features/organization/community.service';
import {
  OrganizationRouteParams,
  UpdateCommunitySettingsRequest,
} from '~~/shared/contracts/organization';

export default defineEventHandler(async (event) => {
  const { orgSlug } = await parseRouteParams(event, OrganizationRouteParams);
  const { organization } = await authorizeCommunityAccess(
    event,
    orgSlug,
    'organization:update'
  );
  const changes = await parseRequestBody(event, UpdateCommunitySettingsRequest);
  return updateCommunitySettings(organization.id, changes);
});
