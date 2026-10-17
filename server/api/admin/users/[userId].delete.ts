import { deleteAccount } from '~~/server/features/auth/user-admin.service';
import { AdminUserRouteParams } from '~~/shared/contracts/account';

export default defineEventHandler(async (event) => {
  const principal = authorizePlatformAccess(event, 'user:delete');
  const { userId } = await parseRouteParams(event, AdminUserRouteParams);

  const result = await deleteAccount(event, {
    userId,
    actorUserId: principal.user.id,
  });
  enrichLog(event, {
    target_user: {
      id: result.account.id,
      email: result.account.email,
      deleted_organization_ids: result.deletedOrganizationIds,
      community_organization_ids: result.communityOrganizationIds,
    },
  });
  return respondNoContent(event);
});
