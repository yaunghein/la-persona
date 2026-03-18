import { createAccessControl } from 'better-auth/plugins/access';

export const organizationPermissionStatements = {
  organization: ['read', 'update', 'delete'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
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
  card: ['create', 'read', 'update', 'delete'],
  contactExchange: ['create', 'read', 'delete'],
  cardRequest: ['create', 'update'],
  media: ['upload'],
});

export const organizationAdminRole = organizationAccessControl.newRole({
  organization: ['read', 'update'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
  card: ['create', 'read', 'readAll', 'update', 'delete'],
  contactExchange: ['create', 'read', 'readAll', 'delete'],
  cardRequest: ['create', 'update'],
  media: ['upload'],
});

export const organizationOwnerRole = organizationAccessControl.newRole({
  organization: ['read', 'update', 'delete'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
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
