import type { H3Event } from 'h3';
import type { auth } from '~~/server/auth';
import {
  findMembershipByOrganizationId,
  findMembershipByOrganizationSlug,
  type OrganizationMembership,
} from '~~/server/features/organization/membership.repository';
import {
  roleHasPermission,
  type OrganizationPermissionKey,
} from '~~/shared/permissions/organization';
import {
  platformRoleHasPermission,
  type PlatformPermissionKey,
} from '~~/shared/permissions/platform';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

type AuthSession = typeof auth.$Infer.Session;

/** The authenticated caller, resolved once per request by `01.authentication`. */
export type Principal = {
  user: AuthSession['user'];
  session: AuthSession['session'];
  isPlatformAdmin: boolean;
  /** Set when a platform admin is impersonating `user`. */
  impersonatorId: string | null;
};

export type OrganizationAccess = OrganizationMembership & {
  principal: Principal;
};

export function findPrincipal(event: H3Event): Principal | null {
  return event.context.principal ?? null;
}

export function requirePrincipal(event: H3Event): Principal {
  const principal = findPrincipal(event);
  if (!principal) throw unauthorized();
  return principal;
}

/**
 * Back-office access. Non-admins get 404 so admin routes are not discoverable;
 * admins without the specific permission get 403.
 */
export function authorizePlatformAccess(
  event: H3Event,
  permission: PlatformPermissionKey
): Principal {
  const principal = requirePrincipal(event);
  if (!principal.isPlatformAdmin) throw notFound();
  if (!platformRoleHasPermission(principal.user.role, permission)) {
    throw forbidden();
  }
  return principal;
}

export function canAccessOrganization(
  access: Pick<OrganizationAccess, 'membership'>,
  permission: OrganizationPermissionKey
): boolean {
  return roleHasPermission(access.membership.role, permission);
}

export function assertOrganizationPermission(
  access: Pick<OrganizationAccess, 'membership'>,
  permission: OrganizationPermissionKey
): void {
  if (!canAccessOrganization(access, permission)) throw forbidden();
}

function toOrganizationAccess(
  event: H3Event,
  principal: Principal,
  membership: OrganizationMembership | null,
  permission?: OrganizationPermissionKey
): OrganizationAccess {
  // Non-members cannot tell whether the organization (or resource) exists.
  if (!membership) throw notFound();

  enrichLog(event, {
    organization_id: membership.organization.id,
    organization_name: membership.organization.name,
  });

  const access = { ...membership, principal };
  if (permission) assertOrganizationPermission(access, permission);
  return access;
}

/** Org-scoped collection routes: `/api/organizations/{orgSlug}/…`. */
export async function authorizeOrganizationAccess(
  event: H3Event,
  organizationSlug: string,
  permission?: OrganizationPermissionKey
): Promise<OrganizationAccess> {
  const principal = requirePrincipal(event);
  const membership = await findMembershipByOrganizationSlug(
    principal.user.id,
    organizationSlug
  );
  return toOrganizationAccess(event, principal, membership, permission);
}

/** Resource policies: the organization is resolved from the loaded resource. */
export async function authorizeOrganizationAccessById(
  event: H3Event,
  organizationId: string,
  permission?: OrganizationPermissionKey
): Promise<OrganizationAccess> {
  const principal = requirePrincipal(event);
  const membership = await findMembershipByOrganizationId(
    principal.user.id,
    organizationId
  );
  return toOrganizationAccess(event, principal, membership, permission);
}

export function assertCommunityOrganization(
  organization: OrganizationMembership['organization']
): void {
  if (organization.type !== ORGANIZATION_TYPES.COMMUNITY) {
    throw forbidden(
      'This is only available for community organizations.',
      'community_only'
    );
  }
}
