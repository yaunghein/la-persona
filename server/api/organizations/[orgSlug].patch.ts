import { authorizeCommunityAccess } from '~~/server/features/organization/organization.policy';
import {
  describeCommunityAbout,
  updateCommunitySettings,
} from '~~/server/features/organization/community.service';
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
  enrichLog(event, { organization: { id: organization.id } });
  const changes = await parseRequestBody(event, UpdateCommunitySettingsRequest);
  await updateCommunitySettings(organization.id, changes);
  return describeCommunityAbout(organization.id);
});
