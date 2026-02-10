import { and, eq, sql, gte } from 'drizzle-orm';
import { db } from '~~/server/db';
import { auth } from '~~/server/auth';
import { analytics, member } from '~~/server/db/schema';

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session || !session.session.activeOrganizationId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const { cardId } = getQuery(event);
  const orgId = session.session.activeOrganizationId;
  const userId = session.user.id;

  // 1. Role Check
  const userMemberInfo = await db.query.member.findFirst({
    where: and(eq(member.organizationId, orgId), eq(member.userId, userId)),
  });

  if (!userMemberInfo) throw createError({ statusCode: 403 });

  // 2. Build Conditions
  let conditions = [eq(analytics.organizationId, orgId)];
  if (userMemberInfo.role !== 'owner' && userMemberInfo.role !== 'admin') {
    conditions.push(eq(analytics.userId, userId as string));
  }
  if (cardId && cardId !== 'all') {
    conditions.push(eq(analytics.cardId, cardId as string));
  }

  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);

  // 3. Parallel Data Fetching
  const [totalStats, dailyViews, socialClicks, linkClicks, saveActions] =
    await Promise.all([
      db
        .select({ type: analytics.type, count: sql<number>`count(*)` })
        .from(analytics)
        .where(and(...conditions))
        .groupBy(analytics.type),

      db
        .select({
          date: sql`DATE_TRUNC('day', ${analytics.createdAt})`.as('day'),
          count: sql<number>`count(*)`,
        })
        .from(analytics)
        .where(
          and(
            ...conditions,
            eq(analytics.type, 'view'),
            gte(analytics.createdAt, last7Days)
          )
        )
        .groupBy(sql`day`)
        .orderBy(sql`day`),

      db
        .select({
          platform: sql<string>`metadata->>'platform'`,
          count: sql<number>`count(*)`,
        })
        .from(analytics)
        .where(and(...conditions, eq(analytics.type, 'social_click')))
        .groupBy(sql`metadata->>'platform'`),

      db
        .select({
          label: sql<string>`metadata->>'label'`,
          count: sql<number>`count(*)`,
        })
        .from(analytics)
        .where(and(...conditions, eq(analytics.type, 'link_click')))
        .groupBy(sql`metadata->>'label'`),

      db
        .select({
          action: sql<string>`metadata->>'action'`,
          count: sql<number>`count(*)`,
        })
        .from(analytics)
        .where(and(...conditions, eq(analytics.type, 'save_action')))
        .groupBy(sql`metadata->>'action'`),
    ]);

  return { totalStats, dailyViews, socialClicks, linkClicks, saveActions };
});
