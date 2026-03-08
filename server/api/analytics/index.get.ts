import { and, eq, sql, gte } from 'drizzle-orm';
import { db } from '~~/server/db';
import { auth } from '~~/server/auth';
import { analytics, card, member } from '~~/server/db/schema';

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session || !session.session.activeOrganizationId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const { cardId } = getQuery(event);
  const selectedCardId = typeof cardId === 'string' ? cardId : 'all';
  const orgId = session.session.activeOrganizationId;
  const userId = session.user.id;

  const userMemberInfo = await db.query.member.findFirst({
    where: and(eq(member.organizationId, orgId), eq(member.userId, userId)),
  });

  if (!userMemberInfo) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }
  const isOwner = userMemberInfo.role === 'owner';

  let conditions = [eq(analytics.organizationId, orgId)];
  if (!isOwner) {
    conditions.push(eq(analytics.userId, userId as string));
  }

  if (selectedCardId !== 'all') {
    const accessibleCard = await db.query.card.findFirst({
      where: and(
        eq(card.id, selectedCardId),
        eq(card.organizationId, orgId),
        ...(isOwner ? [] : [eq(card.userId, userId)])
      ),
      columns: { id: true },
    });

    if (!accessibleCard) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have access to this card analytics.',
      });
    }

    conditions.push(eq(analytics.cardId, selectedCardId));
  }

  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);

  const [
    totalStats,
    dailyViews,
    socialClicks,
    linkClicks,
    saveActions,
    ownerCardOptions,
  ] =
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

      isOwner
        ? db
            .select({
              id: card.id,
              firstName: card.firstName,
              lastName: card.lastName,
            })
            .from(card)
            .where(eq(card.organizationId, orgId))
        : Promise.resolve([]),
    ]);

  return {
    isOwner,
    totalStats,
    dailyViews,
    socialClicks,
    linkClicks,
    saveActions,
    cards: ownerCardOptions.map((item) => ({
      id: item.id,
      label: `${item.firstName} ${item.lastName || ''}`.trim(),
    })),
  };
});
