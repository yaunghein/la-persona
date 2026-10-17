import {
  createAccessControl,
  type Role,
} from 'better-auth/plugins/access';
import {
  adminAc,
  defaultStatements,
  userAc,
} from 'better-auth/plugins/admin/access';

/**
 * Platform-wide (Thakhin back-office) permissions, enforced by the better-auth
 * admin plugin. `defaultStatements` keeps the plugin's own user/session rules.
 */
export const platformPermissionStatements = {
  ...defaultStatements,
  organization: ['read', 'create', 'update', 'delete'],
  card: ['read', 'create', 'update', 'delete'],
  cardRequest: ['read', 'review'],
  payment: ['read', 'review'],
  onboardingInvitation: ['read', 'create', 'send', 'cancel'],
  feedback: ['read', 'delete'],
  insight: ['read'],
  media: ['upload'],
} as const;

export const platformAccessControl = createAccessControl(
  platformPermissionStatements
);

export const platformAdminRole = platformAccessControl.newRole({
  ...adminAc.statements,
  organization: ['read', 'create', 'update', 'delete'],
  card: ['read', 'create', 'update', 'delete'],
  cardRequest: ['read', 'review'],
  payment: ['read', 'review'],
  onboardingInvitation: ['read', 'create', 'send', 'cancel'],
  feedback: ['read', 'delete'],
  insight: ['read'],
  media: ['upload'],
});

export const platformUserRole = platformAccessControl.newRole({
  ...userAc.statements,
});

export const platformRoles = {
  admin: platformAdminRole,
  user: platformUserRole,
};

export type PlatformRole = keyof typeof platformRoles;

type PlatformPermissionStatements = typeof platformPermissionStatements;

/** A single platform permission, written `resource:action` (e.g. `payment:review`). */
export type PlatformPermissionKey = {
  [Resource in keyof PlatformPermissionStatements]: `${Resource}:${PlatformPermissionStatements[Resource][number]}`;
}[keyof PlatformPermissionStatements];

export function isPlatformRole(
  role: string | null | undefined
): role is PlatformRole {
  return !!role && role in platformRoles;
}

export function platformRoleHasPermission(
  role: string | null | undefined,
  permission: PlatformPermissionKey
): boolean {
  const [resource, action] = permission.split(':') as [
    keyof PlatformPermissionStatements,
    string,
  ];
  return String(role ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(isPlatformRole)
    .some(
      (platformRole) =>
        (platformRoles[platformRole] as Role).authorize({ [resource]: [action] })
          .success
    );
}
