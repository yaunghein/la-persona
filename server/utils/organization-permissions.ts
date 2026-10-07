import type { H3Event } from 'h3';
import type { User, Session } from 'better-auth';
import { and, eq } from 'drizzle-orm';
import { auth } from '~~/server/auth';
import { db } from '~~/server/db';
import { member, organization } from '~~/server/db/schema';
import { enrichLog } from '~~/server/utils/wide-event';
import {
  type OrganizationPermission,
  organizationPermissionStatements,
  isOrganizationManagerRole,
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

export function getOrganizationSlugFromRequest(event: H3Event) {
  const query = getQuery(event);
  const querySlug =
    typeof query.organizationSlug === 'string' ? query.organizationSlug.trim() : '';
  if (querySlug) return querySlug;

  const routeSlug = String(getRouterParam(event, 'orgSlug') || '').trim();
  if (routeSlug) return routeSlug;

  return '';
}

async function resolveOrganizationForUser(params: {
  userId: string;
  organizationSlug: string;
}) {
  const membership = await db
    .select({ id: organization.id, name: organization.name })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(
      and(
        eq(member.userId, params.userId),
        eq(organization.slug, params.organizationSlug)
      )
    )
    .limit(1)
    .then((rows) => rows[0]);

  return membership || null;
}

export async function requireOrganizationSession(event: H3Event) {
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }

  const requestedSlug = getOrganizationSlugFromRequest(event);
  if (!requestedSlug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Organization slug is required.',
    });
  }

  const org = await resolveOrganizationForUser({
    userId: session.user.id,
    organizationSlug: requestedSlug,
  });
  if (!org) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
    });
  }

  session.session.activeOrganizationId = org.id;
  enrichLog(event, { organization_id: org.id, organization_name: org.name });

  return session as SessionWithOrganization;
}

export async function requireSession(event: H3Event) {
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }

  return session;
}

export async function requireCommunityOrganization(event: H3Event) {
  const session = await requireOrganizationSession(event);
  const org = await db.query.organization.findFirst({
    where: eq(organization.id, session.session.activeOrganizationId),
    columns: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      type: true,
    },
  });

  if (!org || org.type !== 'community') {
    throw createError({
      statusCode: 400,
      statusMessage:
        'This action is only available for community organizations',
    });
  }

  return { session, org };
}

export async function requireCommunityManager(
  event: H3Event,
  statusMessage = 'Forbidden'
) {
  const session = await requireOrganizationSession(event);
  const membership = await db
    .select({ role: member.role })
    .from(member)
    .where(
      and(
        eq(member.userId, session.user.id),
        eq(member.organizationId, session.session.activeOrganizationId)
      )
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!isOrganizationManagerRole(membership?.role)) {
    throw createError({
      statusCode: 403,
      statusMessage,
    });
  }

  return session;
}

export async function hasOrganizationPermission(
  event: H3Event,
  permissions: OrganizationPermission,
  organizationId?: string
) {
  const resolvedOrganizationId =
    organizationId || (await requireOrganizationSession(event)).session.activeOrganizationId;
  const mutablePermissions = toMutableOrganizationPermission(permissions);
  const result = await auth.api.hasPermission({
    headers: event.headers,
    body: {
      permissions: mutablePermissions,
      organizationId: resolvedOrganizationId,
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
  const hasPermission = await hasOrganizationPermission(
    event,
    permissions,
    session.session.activeOrganizationId
  );

  if (!hasPermission) {
    throw createError({
      statusCode: 403,
      statusMessage,
    });
  }

  return session;
}
