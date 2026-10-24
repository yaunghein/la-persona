import { createOrganization } from '~~/server/features/organization/organization-admin.service';
import { CreateOrganizationRequest } from '~~/shared/contracts/organization';

export default defineEventHandler(async (event) => {
  const principal = authorizePlatformAccess(event, 'organization:create');
  const request = await parseRequestBody(event, CreateOrganizationRequest);
  const { summary, ownerInvitation, emails } = await createOrganization(
    request,
    principal.user.id
  );
  enrichLog(event, {
    organization: { id: summary.id, slug: summary.slug, type: summary.type },
    ...(ownerInvitation && {
      invitation: {
        id: ownerInvitation.id,
        email: ownerInvitation.email,
        role: ownerInvitation.role,
      },
      email: { attempted: true, to: [ownerInvitation.email] },
    }),
  });
  if (emails) trackEmailSends(event, emails);
  return respondCreated(
    event,
    `/api/admin/organizations/${summary.id}`,
    summary
  );
});
