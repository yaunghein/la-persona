import { createAccessControl, type Role } from 'better-auth/plugins/access';

export const organizationPermissionStatements = {
  organization: ['read', 'update', 'delete'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
  event: ['create', 'read', 'update', 'delete'],
  card: ['create', 'read', 'readAll', 'update', 'delete'],
  contactExchange: ['create', 'read', 'readAll', 'delete'],
  cardRequest: ['create', 'update'],
  media: ['upload'],
  checkIn: ['read', 'create'],
  insight: ['read'],
} as const;

export const organizationAccessControl = createAccessControl(
  organizationPermissionStatements
);

export const organizationMemberRole = organizationAccessControl.newRole({
  organization: ['read'],
  event: ['read'],
  card: ['read', 'update'],
  media: ['upload'],
});

export const organizationVolunteerRole = organizationAccessControl.newRole({
  organization: ['read'],
  event: ['read'],
  card: ['read', 'update'],
  media: ['upload'],
  checkIn: ['read', 'create'],
});

export const organizationAdminRole = organizationAccessControl.newRole({
  insight: ['read'],
  organization: ['read', 'update', 'delete'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
  event: ['create', 'read', 'update', 'delete'],
  card: ['create', 'read', 'readAll', 'update', 'delete'],
  contactExchange: ['create', 'read', 'readAll', 'delete'],
  cardRequest: ['create', 'update'],
  media: ['upload'],
  checkIn: ['read', 'create'],
});

export const organizationRoles = {
  admin: organizationAdminRole,
  member: organizationMemberRole,
  volunteer: organizationVolunteerRole,
};

type OrganizationPermissionStatements = typeof organizationPermissionStatements;

/** A single org-scoped permission, written `resource:action` (e.g. `event:update`). */
export type OrganizationPermissionKey = {
  [Resource in keyof OrganizationPermissionStatements]: `${Resource}:${OrganizationPermissionStatements[Resource][number]}`;
}[keyof OrganizationPermissionStatements];

export function isOrganizationRole(
  role: string | null | undefined
): role is OrganizationMemberRole {
  return !!role && role in organizationRoles;
}

/**
 * Checks a member role against a permission in memory, using the same access
 * control definition better-auth enforces. Better-auth stores multiple roles
 * comma-separated; any granting role is enough.
 */
export function roleHasPermission(
  role: string | null | undefined,
  permission: OrganizationPermissionKey
): boolean {
  const [resource, action] = permission.split(':') as [
    keyof OrganizationPermissionStatements,
    string,
  ];
  return String(role ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(isOrganizationRole)
    .some(
      (memberRole) =>
        (organizationRoles[memberRole] as Role).authorize({
          [resource]: [action],
        }).success
    );
}

export type OrganizationMemberRole = 'admin' | 'member' | 'volunteer';

export const COMMUNITY_INVITE_ROLES = ['member', 'volunteer'] as const;

export type CommunityInviteRole = (typeof COMMUNITY_INVITE_ROLES)[number];

export function isOrganizationManagerRole(
  role: string | null | undefined
): boolean {
  return role === 'admin';
}

export function isCommunityMemberOnly(params: {
  type?: string | null;
  role?: string | null;
}) {
  return params.type === 'community' && params.role === 'member';
}

export function isCommunityVolunteer(params: {
  type?: string | null;
  role?: string | null;
}) {
  return params.type === 'community' && params.role === 'volunteer';
}

export function canRunCheckIn(role: string | null | undefined): boolean {
  return isOrganizationManagerRole(role) || role === 'volunteer';
}

export function formatCommunityRole(role: string | null | undefined): string {
  if (!role) return 'Member';
  // Stored as `admin`; communities call this role Organizer.
  if (role === 'admin') return 'Organizer';
  return role.charAt(0).toUpperCase() + role.slice(1);
}
