import {
  deleteCardAndHolderForAdmin,
  deleteCardForAdmin,
} from '~~/server/features/card/card-admin.service';
import {
  AdminCardRouteParams,
  DeleteAdminCardQuery,
} from '~~/shared/contracts/card';

export default defineEventHandler(async (event) => {
  const principal = authorizePlatformAccess(event, 'card:delete');
  const { cardId } = await parseRouteParams(event, AdminCardRouteParams);
  const { withUser } = await parseRequestQuery(event, DeleteAdminCardQuery);

  if (!withUser) {
    const deleted = await deleteCardForAdmin(cardId);
    enrichLog(event, { card: { id: deleted.id, slug: deleted.slug } });
    return respondNoContent(event);
  }

  authorizePlatformAccess(event, 'user:delete');
  const result = await deleteCardAndHolderForAdmin(event, {
    cardId,
    actorUserId: principal.user.id,
  });
  enrichLog(event, {
    card: { id: result.card.id, slug: result.card.slug },
    target_user: {
      id: result.account.id,
      email: result.account.email,
      deleted_organization_ids: result.deletedOrganizationIds,
      community_organization_ids: result.communityOrganizationIds,
    },
  });
  return respondNoContent(event);
});
