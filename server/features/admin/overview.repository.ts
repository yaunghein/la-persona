import { and, count, eq, gte, isNotNull, isNull, lt, sql } from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  analytics,
  card,
  cardRequest,
  cardUpdateRequest,
  contactExchange,
  event,
  onboardingInvitation,
  organization,
  subscriptionPayment,
  subscriptionPaymentItem,
  subscriptionPlan,
  user,
  userDailyActivity,
} from '~~/server/db/schema';
import type {
  AdminChartBucket,
  AdminChartRange,
  AdminCharts,
  AdminEngagementTotals,
  AdminOverview,
  AdminRevenue,
  AdminRevenueRange,
} from '~~/shared/contracts/admin';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';
import {
  addYangonDays,
  addYangonMonths,
  yangonDay,
  yangonDayStart,
} from '~~/server/lib/yangon-time';

function asNumber(value: unknown) {
  return Number(value ?? 0);
}

async function countWhere(table: any, where?: any) {
  const query = db.select({ value: count() }).from(table);
  const [row] = where ? await query.where(where) : await query;
  return asNumber(row?.value);
}

export async function getAdminOverview(): Promise<
  Omit<AdminOverview, 'subscriptions'>
> {
  const today = yangonDay();
  const yesterday = addYangonDays(today, -1);
  const tomorrowStart = yangonDayStart(addYangonDays(today, 1));
  const monthStartDay = `${today.slice(0, 7)}-01`;
  const monthStart = yangonDayStart(monthStartDay);
  const nextMonthStart = yangonDayStart(addYangonMonths(monthStartDay, 1));
  const previousMonthStart = yangonDayStart(addYangonMonths(monthStartDay, -1));
  const windowStartDay = addYangonDays(today, -29);
  const windowStart = yangonDayStart(windowStartDay);
  const previousWindowStart = yangonDayStart(
    addYangonDays(windowStartDay, -30)
  );
  const expiringBefore = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const now = new Date();

  const between = (column: any, start: Date, end: Date) =>
    and(gte(column, start), lt(column, end));

  const [
    users,
    cardsTotal,
    cardsClaimed,
    orgsTotal,
    orgsCommunity,
    events,
    dailyActiveToday,
    dailyActiveYesterday,
    designQueue,
    standalonePayments,
    updateRequests,
    expiringInvitations,
    newUsersCurrent,
    newUsersPrevious,
    cardsCurrent,
    cardsPrevious,
    invitesSent,
    invitesSentPrevious,
    invitesAccepted,
    invitesAcceptedPrevious,
    analyticsCurrent,
    analyticsPrevious,
    exchangesCurrent,
    exchangesPrevious,
  ] = await Promise.all([
    countWhere(user),
    countWhere(card),
    countWhere(card, isNotNull(card.userId)),
    countWhere(organization),
    countWhere(
      organization,
      eq(organization.type, ORGANIZATION_TYPES.COMMUNITY)
    ),
    countWhere(event),
    countWhere(userDailyActivity, eq(userDailyActivity.day, today)),
    countWhere(userDailyActivity, eq(userDailyActivity.day, yesterday)),
    db
      .select({
        value: count(),
        oldest: sql<Date | null>`min(${cardRequest.createdAt})`,
      })
      .from(cardRequest)
      .where(eq(cardRequest.status, 'pending')),
    db
      .select({ value: count() })
      .from(subscriptionPayment)
      .where(
        and(
          eq(subscriptionPayment.status, 'submitted'),
          isNull(subscriptionPayment.requestId),
          sql`(${subscriptionPayment.note} is null or ${subscriptionPayment.note} !~ '^(New|Existing) design request \\([^)]+\\)$')`
        )
      ),
    countWhere(cardUpdateRequest, eq(cardUpdateRequest.status, 'pending')),
    countWhere(
      onboardingInvitation,
      and(
        eq(onboardingInvitation.status, 'pending'),
        gte(onboardingInvitation.expiresAt, now),
        lt(onboardingInvitation.expiresAt, expiringBefore)
      )
    ),
    countWhere(user, between(user.createdAt, monthStart, nextMonthStart)),
    countWhere(user, between(user.createdAt, previousMonthStart, monthStart)),
    countWhere(card, between(card.createdAt, monthStart, nextMonthStart)),
    countWhere(card, between(card.createdAt, previousMonthStart, monthStart)),
    countWhere(
      onboardingInvitation,
      between(onboardingInvitation.createdAt, monthStart, nextMonthStart)
    ),
    countWhere(
      onboardingInvitation,
      between(onboardingInvitation.createdAt, previousMonthStart, monthStart)
    ),
    countWhere(
      onboardingInvitation,
      between(onboardingInvitation.acceptedAt, monthStart, nextMonthStart)
    ),
    countWhere(
      onboardingInvitation,
      between(onboardingInvitation.acceptedAt, previousMonthStart, monthStart)
    ),
    countAnalyticsByType(windowStart, tomorrowStart),
    countAnalyticsByType(previousWindowStart, windowStart),
    countWhere(
      contactExchange,
      between(contactExchange.createdAt, windowStart, tomorrowStart)
    ),
    countWhere(
      contactExchange,
      between(contactExchange.createdAt, previousWindowStart, windowStart)
    ),
  ]);

  const oldest = designQueue[0]?.oldest
    ? new Date(designQueue[0].oldest)
    : null;
  const oldestAgeHours = oldest
    ? Math.max(0, Math.round((Date.now() - oldest.getTime()) / 36e5))
    : null;

  return {
    census: {
      users,
      cards: {
        total: cardsTotal,
        claimed: cardsClaimed,
        unclaimed: cardsTotal - cardsClaimed,
      },
      organizations: {
        total: orgsTotal,
        personal: orgsTotal - orgsCommunity,
        community: orgsCommunity,
      },
      events,
    },
    queues: {
      designRequests: {
        count: asNumber(designQueue[0]?.value),
        oldestAgeHours,
      },
      standalonePayments: { count: asNumber(standalonePayments[0]?.value) },
      updateRequests: { count: updateRequests },
      expiringInvitations: { count: expiringInvitations },
    },
    month: {
      newUsers: { current: newUsersCurrent, previous: newUsersPrevious },
      cardsCreated: { current: cardsCurrent, previous: cardsPrevious },
      invitationsSent: { current: invitesSent, previous: invitesSentPrevious },
      invitationsAccepted: {
        current: invitesAccepted,
        previous: invitesAcceptedPrevious,
      },
    },
    engagement: {
      dailyActive: {
        today: dailyActiveToday,
        yesterday: dailyActiveYesterday,
      },
      current: { ...analyticsCurrent, contactExchanges: exchangesCurrent },
      previous: { ...analyticsPrevious, contactExchanges: exchangesPrevious },
    },
  };
}

const CHART_RANGES: Record<
  AdminChartRange,
  { bucket: AdminChartBucket; count: number }
> = {
  '1w': { bucket: 'day', count: 7 },
  '1m': { bucket: 'day', count: 30 },
  '3m': { bucket: 'week', count: 13 },
  '6m': { bucket: 'week', count: 26 },
  '1y': { bucket: 'month', count: 12 },
};

export function chartWindow(range: AdminChartRange) {
  const { bucket, count: bucketCount } = CHART_RANGES[range];
  const today = yangonDay();
  const lastStart =
    bucket === 'day'
      ? today
      : bucket === 'week'
        ? mondayOnOrBefore(today)
        : `${today.slice(0, 7)}-01`;
  const starts = Array.from({ length: bucketCount }, (_, index) => {
    const offset = index - (bucketCount - 1);
    if (bucket === 'day') return addYangonDays(lastStart, offset);
    if (bucket === 'week') return addYangonDays(lastStart, offset * 7);
    return addYangonMonths(lastStart, offset);
  });
  const firstDay = starts[0]!;
  const previousFirst =
    bucket === 'month'
      ? addYangonMonths(firstDay, -bucketCount)
      : addYangonDays(
          firstDay,
          bucket === 'week' ? -bucketCount * 7 : -bucketCount
        );
  return {
    bucket,
    starts,
    rangeStart: yangonDayStart(firstDay),
    previousStart: yangonDayStart(previousFirst),
  };
}

export async function getAdminCharts(
  range: AdminChartRange
): Promise<AdminCharts> {
  const { bucket, starts, rangeStart } = chartWindow(range);
  const firstDay = starts[0]!;

  // A literal unit keeps the select and group-by expressions identical for Postgres.
  const unit = sql.raw(`'${bucket}'`);
  const yangonBucket = (column: any) =>
    sql<string>`to_char(date_trunc(${unit}, (${column} AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Yangon'), 'YYYY-MM-DD')`;
  const dayBucket = sql<string>`to_char(date_trunc(${unit}, ${userDailyActivity.day}::timestamp), 'YYYY-MM-DD')`;

  const [activeRows, analyticsRows, revenueRows] = await Promise.all([
    db
      .select({
        start: dayBucket,
        value: sql<number>`count(distinct ${userDailyActivity.userId})::int`,
      })
      .from(userDailyActivity)
      .where(gte(userDailyActivity.day, firstDay))
      .groupBy(dayBucket),
    db
      .select({
        start: yangonBucket(analytics.createdAt),
        type: analytics.type,
        value: count(),
      })
      .from(analytics)
      .where(gte(analytics.createdAt, rangeStart))
      .groupBy(yangonBucket(analytics.createdAt), analytics.type),
    db
      .select({
        start: yangonBucket(subscriptionPayment.updatedAt),
        value: sql<number>`coalesce(sum(${subscriptionPaymentItem.amountMinor}), 0)::int`,
      })
      .from(subscriptionPaymentItem)
      .innerJoin(
        subscriptionPayment,
        eq(subscriptionPaymentItem.paymentId, subscriptionPayment.id)
      )
      .where(
        and(
          eq(subscriptionPayment.status, 'approved'),
          gte(subscriptionPayment.updatedAt, rangeStart)
        )
      )
      .groupBy(yangonBucket(subscriptionPayment.updatedAt)),
  ]);

  const activeByStart = new Map(
    activeRows.map((row) => [row.start, asNumber(row.value)])
  );
  const revenueByStart = new Map(
    revenueRows.map((row) => [row.start, asNumber(row.value)])
  );
  const analyticsByStart = new Map<
    string,
    { views: number; interactions: number }
  >();
  for (const row of analyticsRows) {
    const totals = analyticsByStart.get(row.start) || {
      views: 0,
      interactions: 0,
    };
    if (row.type === 'view') totals.views += asNumber(row.value);
    else totals.interactions += asNumber(row.value);
    analyticsByStart.set(row.start, totals);
  }

  return {
    range,
    bucket,
    points: starts.map((start) => ({
      start,
      activePeople: activeByStart.get(start) ?? 0,
      views: analyticsByStart.get(start)?.views ?? 0,
      interactions: analyticsByStart.get(start)?.interactions ?? 0,
      revenueMinor: revenueByStart.get(start) ?? 0,
    })),
  };
}

function mondayOnOrBefore(day: string) {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Yangon',
    weekday: 'short',
  }).format(yangonDayStart(day));
  const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const shift = Math.max(0, order.indexOf(weekday));
  return addYangonDays(day, -shift);
}

async function countAnalyticsByType(
  start: Date,
  end: Date
): Promise<Omit<AdminEngagementTotals, 'contactExchanges'>> {
  const rows = await db
    .select({ type: analytics.type, value: count() })
    .from(analytics)
    .where(and(gte(analytics.createdAt, start), lt(analytics.createdAt, end)))
    .groupBy(analytics.type);
  const byType = new Map(rows.map((row) => [row.type, asNumber(row.value)]));
  return {
    views: byType.get('view') ?? 0,
    linkClicks: byType.get('link_click') ?? 0,
    socialClicks: byType.get('social_click') ?? 0,
    saves: byType.get('save_action') ?? 0,
  };
}

async function sumApprovedRevenue(start: Date | null, end: Date | null) {
  const [row] = await db
    .select({
      value: sql<number>`coalesce(sum(${subscriptionPaymentItem.amountMinor}), 0)::int`,
    })
    .from(subscriptionPaymentItem)
    .innerJoin(
      subscriptionPayment,
      eq(subscriptionPaymentItem.paymentId, subscriptionPayment.id)
    )
    .where(approvedBetween(start, end));
  return asNumber(row?.value);
}

function approvedBetween(start: Date | null, end: Date | null) {
  return and(
    eq(subscriptionPayment.status, 'approved'),
    start ? gte(subscriptionPayment.updatedAt, start) : undefined,
    end ? lt(subscriptionPayment.updatedAt, end) : undefined
  );
}

async function listRevenueByPlan(start: Date | null, end: Date | null) {
  const rows = await db
    .select({
      planCode: subscriptionPaymentItem.planCode,
      planName: subscriptionPlan.name,
      amountMinor: sql<number>`coalesce(sum(${subscriptionPaymentItem.amountMinor}), 0)::int`,
      periods: count(),
    })
    .from(subscriptionPaymentItem)
    .innerJoin(
      subscriptionPayment,
      eq(subscriptionPaymentItem.paymentId, subscriptionPayment.id)
    )
    .innerJoin(
      subscriptionPlan,
      eq(subscriptionPlan.code, subscriptionPaymentItem.planCode)
    )
    .where(approvedBetween(start, end))
    .groupBy(subscriptionPaymentItem.planCode, subscriptionPlan.name);
  return rows
    .map((row) => ({
      planCode: row.planCode,
      planName: row.planName,
      amountMinor: asNumber(row.amountMinor),
      periods: asNumber(row.periods),
    }))
    .sort((a, b) => b.amountMinor - a.amountMinor);
}

export async function getAdminRevenue(
  range: AdminRevenueRange
): Promise<AdminRevenue> {
  const window = range === 'all' ? null : chartWindow(range);
  const start = window?.rangeStart ?? null;
  const [total, previous, byPlan] = await Promise.all([
    sumApprovedRevenue(start, null),
    window
      ? sumApprovedRevenue(window.previousStart, window.rangeStart)
      : Promise.resolve(null),
    listRevenueByPlan(start, null),
  ]);
  return { range, currency: 'MMK', total, previous, byPlan };
}
