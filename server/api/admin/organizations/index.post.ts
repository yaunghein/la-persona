import { createOrganization } from '~~/server/features/organization/organization-admin.service';
import { CreateOrganizationRequest } from '~~/shared/contracts/organization';

export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'organization:create');
  const request = await parseRequestBody(event, CreateOrganizationRequest);
  const created = await createOrganization(request);
  enrichLog(event, {
    organization: { id: created.id, slug: created.slug, type: created.type },
  });
  return respondCreated(event, `/api/admin/organizations/${created.id}`, created);
});
