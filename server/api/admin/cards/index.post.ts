import { createCardForAdmin } from '~~/server/features/card/card-admin.service';
import { CreateAdminCardRequest } from '~~/shared/contracts/card';

export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'card:create');
  const request = await parseRequestBody(event, CreateAdminCardRequest);
  const created = await createCardForAdmin(request);
  enrichLog(event, {
    card: {
      id: created.id,
      slug: created.slug,
      organization_id: created.organizationId,
      ...(created.email ? { email: created.email } : {}),
    },
  });
  return respondCreated(event, `/api/admin/cards/${created.id}`, created);
});
