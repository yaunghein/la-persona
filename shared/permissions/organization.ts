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
} as const;

export const organizationAccessControl = createAccessControl(
  organizationPermissionStatements
);

export const organizationMemberRole = organizationAccessControl.newRole({
  organization: ['read'],
  event: ['read'],
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
});

export const organizationRoles = {
  owner: organizationOwnerRole,
  admin: organizationAdminRole,
  member: organizationMemberRole,
};

export const ORGANIZATION_PERMISSIONS = {
  ORGANIZATION_READ: { organization: ['read'] },
  ORGANIZATION_UPDATE: { organization: ['update'] },
  ORGANIZATION_DELETE: { organization: ['delete'] },
  EVENT_CREATE: { event: ['create'] },
  EVENT_READ: { event: ['read'] },
  EVENT_UPDATE: { event: ['update'] },
  EVENT_DELETE: { event: ['delete'] },
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
} as const;

export type OrganizationPermission = {
  [Resource in keyof typeof organizationPermissionStatements]?: ReadonlyArray<
    (typeof organizationPermissionStatements)[Resource][number]
  >;
};

export type OrganizationMemberRole = 'owner' | 'admin' | 'member';

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
