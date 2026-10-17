import { listOrganizations } from '~~/server/features/organization/organization-admin.service';

export default defineEventHandler((event) => {
  authorizePlatformAccess(event, 'organization:read');
  return listOrganizations();
});
