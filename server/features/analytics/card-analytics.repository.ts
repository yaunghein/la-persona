import { and, eq, gte, inArray, sql, type SQL } from 'drizzle-orm';
import { db } from '~~/server/db';
import { analytics, card } from '~~/server/db/schema';
import { viewerDaySql } from '~~/server/utils/request-timezone';
import type { TimezoneOffset } from '~~/shared/utils/datetime';

/** Which cards' interactions to aggregate. */
export type CardAnalyticsScope =
  | { organizationId: string; holderUserId?: string; cardId?: string }
  | { cardIds: string[] };

function interactionFilter(
  scope: CardAnalyticsScope,
  since: Date
): SQL | undefined {
  if ('cardIds' in scope) {
    return and(
      inArray(analytics.cardId, scope.cardIds),
      gte(analytics.createdAt, since)
    );
  }
  return and(
    eq(analytics.organizationId, scope.organizationId),
    gte(analytics.createdAt, since),
    // `analytics.user_id` is the card holder at the time of the interaction.
    scope.holderUserId ? eq(analytics.userId, scope.holderUserId) : undefined,
    scope.cardId ? eq(analytics.cardId, scope.cardId) : undefined
  );
}

function cardFilter(scope: CardAnalyticsScope): SQL | undefined {
  if ('cardIds' in scope) return inArray(card.id, scope.cardIds);
  return and(
    eq(card.organizationId, scope.organizationId),
    scope.holderUserId ? eq(card.userId, scope.holderUserId) : undefined,
    scope.cardId ? eq(card.id, scope.cardId) : undefined
  );
}

export async function aggregateCardInteractions(
  scope: CardAnalyticsScope,
  since: Date,
  timezoneOffset?: TimezoneOffset
) {
  const where = interactionFilter(scope, since);
  const ofType = (
    type: 'view' | 'social_click' | 'link_click' | 'save_action'
  ) => and(where, eq(analytics.type, type));
  const total = sql<number>`count(*)::int`;

  const [
    totalStats,
    dailyViews,
    socialClicks,
    linkClicks,
    saveActions,
    cardLinks,
  ] = await Promise.all([
    db
      .select({ type: analytics.type, count: total })
      .from(analytics)
      .where(where)
      .groupBy(analytics.type),
    db
      .select({
        date: viewerDaySql(analytics.createdAt, timezoneOffset).as('day'),
        count: total,
      })
      .from(analytics)
      .where(ofType('view'))
      .groupBy(sql`day`)
      .orderBy(sql`day`),
    db
      .select({ platform: sql<string>`metadata->>'platform'`, count: total })
      .from(analytics)
      .where(ofType('social_click'))
      .groupBy(sql`metadata->>'platform'`),
    db
      .select({ label: sql<string>`metadata->>'label'`, count: total })
      .from(analytics)
      .where(ofType('link_click'))
      .groupBy(sql`metadata->>'label'`),
    db
      .select({ action: sql<string>`metadata->>'action'`, count: total })
      .from(analytics)
      .where(ofType('save_action'))
      .groupBy(sql`metadata->>'action'`),
    db.select({ socials: card.socials }).from(card).where(cardFilter(scope)),
  ]);

  return {
    totalStats,
    dailyViews,
    socialClicks,
    linkClicks,
    saveActions,
    cardLinks,
  };
}
