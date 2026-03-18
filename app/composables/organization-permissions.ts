import type { OrganizationPermission } from '~~/shared/permissions/organization';
import { ORGANIZATION_PERMISSIONS } from '~~/shared/permissions/organization';
import { authClient } from '~~/app/utils/auth-client';

function normalizePermissionResult(result: unknown) {
  if (typeof result === 'boolean') return result;
  if (!result || typeof result !== 'object') return false;

  const maybeSuccess = (result as { success?: unknown }).success;
  if (typeof maybeSuccess === 'boolean') return maybeSuccess;

  return false;
}

export function useOrganizationPermissions() {
  const can = async (permissions: OrganizationPermission) => {
    const result = await authClient.organization.hasPermission({
      permissions,
    });
    return normalizePermissionResult(result);
  };

  return {
    can,
    permissions: ORGANIZATION_PERMISSIONS,
  };
}
