import { updateCardForAdmin } from '~~/server/features/card/card-admin.service';
import { AdminCardRouteParams, UpdateAdminCardRequest } from '~~/shared/contracts/card';

export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'card:update');
  const { cardId } = await parseRouteParams(event, AdminCardRouteParams);
  const changes = await parseRequestBody(event, UpdateAdminCardRequest);
  const updated = await updateCardForAdmin(cardId, changes);
  enrichLog(event, {
    card: {
      id: updated.id,
      slug: updated.slug,
      ...(updated.email ? { email: updated.email } : {}),
    },
  });
  return updated;
});
