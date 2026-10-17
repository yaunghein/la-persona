import { removeOrganization } from '~~/server/features/organization/organization-admin.service';
import { AdminOrganizationRouteParams } from '~~/shared/contracts/organization';

export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'organization:delete');
  const { organizationId } = await parseRouteParams(
    event,
    AdminOrganizationRouteParams
  );

  const { organization, memberEmails } =
    await removeOrganization(organizationId);
  enrichLog(event, {
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      member_emails: memberEmails,
    },
  });
  return respondNoContent(event);
});
