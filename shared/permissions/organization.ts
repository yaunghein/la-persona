import { createAccessControl } from 'better-auth/plugins/access';

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
  organization: ['read', 'update'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
  event: ['create', 'read', 'update', 'delete'],
  card: ['create', 'read', 'readAll', 'update', 'delete'],
  contactExchange: ['create', 'read', 'readAll', 'delete'],
  cardRequest: ['create', 'update'],
  media: ['upload'],
  checkIn: ['read', 'create'],
});

export const organizationOwnerRole = organizationAccessControl.newRole({
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
  owner: organizationOwnerRole,
  admin: organizationAdminRole,
  member: organizationMemberRole,
  volunteer: organizationVolunteerRole,
};

export const ORGANIZATION_PERMISSIONS = {
  ORGANIZATION_READ: { organization: ['read'] },
  ORGANIZATION_UPDATE: { organization: ['update'] },
  ORGANIZATION_DELETE: { organization: ['delete'] },
  EVENT_CREATE: { event: ['create'] },
  EVENT_READ: { event: ['read'] },
  EVENT_UPDATE: { event: ['update'] },
  EVENT_DELETE: { event: ['delete'] },
  MEMBER_CREATE: { member: ['create'] },
  MEMBER_UPDATE: { member: ['update'] },
  MEMBER_DELETE: { member: ['delete'] },
  INVITATION_CREATE: { invitation: ['create'] },
  INVITATION_CANCEL: { invitation: ['cancel'] },
  CARD_CREATE: { card: ['create'] },
  CARD_READ: { card: ['read'] },
  CARD_READ_ALL: { card: ['readAll'] },
  CARD_UPDATE: { card: ['update'] },
  CARD_DELETE: { card: ['delete'] },
  CARD_REQUEST_CREATE: { cardRequest: ['create'] },
  CARD_REQUEST_UPDATE: { cardRequest: ['update'] },
  CONTACT_EXCHANGE_CREATE: { contactExchange: ['create'] },
  CONTACT_EXCHANGE_READ: { contactExchange: ['read'] },
  CONTACT_EXCHANGE_READ_ALL: { contactExchange: ['readAll'] },
  CONTACT_EXCHANGE_DELETE: { contactExchange: ['delete'] },
  MEDIA_UPLOAD: { media: ['upload'] },
  CHECK_IN_READ: { checkIn: ['read'] },
  CHECK_IN_CREATE: { checkIn: ['create'] },
} as const;

export type OrganizationPermission = {
  [Resource in keyof typeof organizationPermissionStatements]?: ReadonlyArray<
    (typeof organizationPermissionStatements)[Resource][number]
  >;
};

export type OrganizationMemberRole = 'owner' | 'admin' | 'member' | 'volunteer';

export const COMMUNITY_INVITE_ROLES = ['member', 'volunteer'] as const;

export type CommunityInviteRole = (typeof COMMUNITY_INVITE_ROLES)[number];

export function isOrganizationManagerRole(
  role: string | null | undefined
): boolean {
  return role === 'owner' || role === 'admin';
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
  return role.charAt(0).toUpperCase() + role.slice(1);
}
