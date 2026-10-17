import { listAccounts } from '~~/server/features/auth/user-admin.service';

export default defineEventHandler((event) => {
  authorizePlatformAccess(event, 'user:list');
  return listAccounts();
});
