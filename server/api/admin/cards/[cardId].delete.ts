import { deleteCardForAdmin } from '~~/server/features/card/card-admin.service';
import { AdminCardRouteParams } from '~~/shared/contracts/card';

export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'card:delete');
  const { cardId } = await parseRouteParams(event, AdminCardRouteParams);
  const deleted = await deleteCardForAdmin(cardId);
  enrichLog(event, { card: { id: deleted.id, slug: deleted.slug } });
  return respondNoContent(event);
});
