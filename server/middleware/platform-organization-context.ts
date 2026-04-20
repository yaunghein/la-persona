import { and, eq } from 'drizzle-orm';
import { auth } from '~~/server/auth';
import { db } from '~~/server/db';
import { member, organization, session as authSession } from '~~/server/db/schema';

const RESERVED_PLATFORM_SEGMENTS = new Set(['invitations']);

export default defineEventHandler(async (event) => {
  const pathname = getRequestURL(event).pathname;
  if (pathname.startsWith('/api/')) return;

  const match = pathname.match(/^\/platform\/([^/]+)/);
  if (!match?.[1]) return;

  const orgSlug = decodeURIComponent(match[1]).trim();
  if (!orgSlug || RESERVED_PLATFORM_SEGMENTS.has(orgSlug)) return;

  const session = await auth.api.getSession({ headers: event.headers });
  if (!session?.session?.id) return;

  const membership = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(and(eq(member.userId, session.user.id), eq(organization.slug, orgSlug)))
    .limit(1)
    .then((rows) => rows[0]);

  if (!membership) return;
  if (session.session.activeOrganizationId === membership.organizationId) return;

  await db
    .update(authSession)
    .set({ activeOrganizationId: membership.organizationId })
    .where(eq(authSession.id, session.session.id));
});
