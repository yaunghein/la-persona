import type { H3Event } from 'h3';
import type { User, Session } from 'better-auth';
import { auth } from '~~/server/auth';
import {
  type OrganizationPermission,
  organizationPermissionStatements,
} from '~~/shared/permissions/organization';

type SessionWithOrganization = {
  user: User;
  session: Session & { activeOrganizationId: string };
};

type MutableOrganizationPermission = {
  -readonly [Resource in keyof typeof organizationPermissionStatements]?: Array<
    (typeof organizationPermissionStatements)[Resource][number]
  >;
};

function toMutableOrganizationPermission(
  permissions: OrganizationPermission
): MutableOrganizationPermission {
  return Object.fromEntries(
    Object.entries(permissions).map(([resource, actions]) => [
      resource,
      actions ? [...actions] : undefined,
    ])
  ) as MutableOrganizationPermission;
}

function isAllowedPermissionResult(result: unknown) {
  if (typeof result === 'boolean') return result;
  if (!result || typeof result !== 'object') return false;

  const maybeSuccess = (result as { success?: unknown }).success;
  if (typeof maybeSuccess === 'boolean') return maybeSuccess;

  return false;
}

export async function requireOrganizationSession(event: H3Event) {
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session || !session.session.activeOrganizationId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }

  return session as SessionWithOrganization;
}

export async function hasOrganizationPermission(
  event: H3Event,
  permissions: OrganizationPermission
) {
  const mutablePermissions = toMutableOrganizationPermission(permissions);
  const result = await auth.api.hasPermission({
    headers: event.headers,
    body: {
      permissions: mutablePermissions,
    },
  });

  return isAllowedPermissionResult(result);
}

export async function requireOrganizationPermission(
  event: H3Event,
  permissions: OrganizationPermission,
  statusMessage = 'Forbidden'
) {
  const session = await requireOrganizationSession(event);
  const hasPermission = await hasOrganizationPermission(event, permissions);

  if (!hasPermission) {
    throw createError({
      statusCode: 403,
      statusMessage,
    });
  }

  return session;
}
