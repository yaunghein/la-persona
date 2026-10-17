import { createAccount } from '~~/server/features/auth/user-admin.service';
import { CreateUserRequest } from '~~/shared/contracts/account';

export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'user:create');
  const request = await parseRequestBody(event, CreateUserRequest);
  const created = await createAccount(event, request);
  enrichLog(event, {
    target_user: { id: created.id, email: created.email, role: request.role },
  });
  return respondCreated(event, `/api/admin/users/${created.id}`, created);
});
