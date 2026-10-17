import { updateAccount } from '~~/server/features/auth/user-admin.service';
import { AdminUserRouteParams, UpdateUserRequest } from '~~/shared/contracts/account';

export default defineEventHandler(async (event) => {
  const principal = authorizePlatformAccess(event, 'user:update');
  const { userId } = await parseRouteParams(event, AdminUserRouteParams);
  const changes = await parseRequestBody(event, UpdateUserRequest);

  const { account, changed } = await updateAccount(event, {
    userId,
    actorUserId: principal.user.id,
    changes,
  });
  enrichLog(event, { target_user: { id: account.id, email: account.email, changed } });
  return { id: account.id, changed };
});
