import type { H3Event } from 'h3';
import type { User, Session } from 'better-auth';
import { and, eq } from 'drizzle-orm';
import { auth } from '~~/server/auth';
import { db } from '~~/server/db';
import { member, organization, session as authSession } from '~~/server/db/schema';
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

function getOrganizationSlugFromRequest(event: H3Event) {
  const query = getQuery(event);
  const querySlug =
    typeof query.organizationSlug === 'string' ? query.organizationSlug.trim() : '';
  if (querySlug) return querySlug;

  const routeSlug = String(getRouterParam(event, 'orgSlug') || '').trim();
  if (routeSlug) return routeSlug;

  const referer = getHeader(event, 'referer');
  if (referer) {
    try {
      const pathname = new URL(referer).pathname;
      const match = pathname.match(/^\/platform\/([^/]+)/);
      if (match?.[1]) return decodeURIComponent(match[1]).trim();
    } catch {
      // Ignore malformed referer values.
    }
  }

  return '';
}

async function resolveOrganizationIdForUser(params: {
  userId: string;
  organizationSlug: string;
}) {
  const membership = await db
    .select({ organizationId: member.organizationId })
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

  return membership?.organizationId || null;
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
  let resolvedOrganizationId = session.session.activeOrganizationId || null;

  if (requestedSlug) {
    const organizationId = await resolveOrganizationIdForUser({
      userId: session.user.id,
      organizationSlug: requestedSlug,
    });
    if (!organizationId) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden',
      });
    }

    resolvedOrganizationId = organizationId;
  }

  if (!resolvedOrganizationId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }

  if (
    session.session.id &&
    session.session.activeOrganizationId !== resolvedOrganizationId
  ) {
    await db
      .update(authSession)
      .set({ activeOrganizationId: resolvedOrganizationId })
      .where(eq(authSession.id, session.session.id));
    session.session.activeOrganizationId = resolvedOrganizationId;
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
