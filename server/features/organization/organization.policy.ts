import type { H3Event } from 'h3';
import { findMemberById } from '~~/server/features/organization/community.repository';
import type { OrganizationPermissionKey } from '~~/shared/permissions/organization';

/** Community-only organization routes: membership + permission + community type. */
export async function authorizeCommunityAccess(
  event: H3Event,
  organizationSlug: string,
  permission?: OrganizationPermissionKey
) {
  const access = await authorizeOrganizationAccess(
    event,
    organizationSlug,
    permission
  );
  assertCommunityOrganization(access.organization);
  return access;
}

/** A member row is managed through the community it belongs to. */
export async function authorizeMemberAccess(
  event: H3Event,
  memberId: string,
  permission: OrganizationPermissionKey
) {
  const target = await findMemberById(memberId);
  if (!target) throw notFound('Member');

  const access = await authorizeOrganizationAccessById(
    event,
    target.organizationId,
    permission
  );
  assertCommunityOrganization(access.organization);
  enrichLog(event, { member: { id: target.id, role: target.role } });
  return { target, ...access };
}
