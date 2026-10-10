import {
  and,
  count,
  eq,
  gte,
  isNotNull,
  isNull,
  lt,
  sql,
} from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  analytics,
  card,
  cardRequest,
  cardSubscription,
  cardUpdateRequest,
  contactExchange,
  event,
  onboardingInvitation,
  organization,
  subscriptionPayment,
  subscriptionPaymentItem,
  user,
  userDailyActivity,
} from '~~/server/db/schema';
import type { AdminOverview } from '~~/shared/types/admin-overview';
import { expireStaleSubscriptions } from '~~/server/services/subscription';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';
import {
  addYangonDays,
  addYangonMonths,
  yangonDay,
  yangonDayStart,
} from '~~/server/utils/yangon';

function asNumber(value: unknown) {
  return Number(value ?? 0);
}

async function countWhere(table: any, where?: any) {
  const query = db.select({ value: count() }).from(table);
  const [row] = where ? await query.where(where) : await query;
  return asNumber(row?.value);
}

export async function getAdminOverview(): Promise<AdminOverview> {
  await expireStaleSubscriptions();

  const today = yangonDay();
  const yesterday = addYangonDays(today, -1);
  const tomorrow = addYangonDays(today, 1);
  const todayStart = yangonDayStart(today);
  const tomorrowStart = yangonDayStart(tomorrow);
  const monthStartDay = `${today.slice(0, 7)}-01`;
  const monthStart = yangonDayStart(monthStartDay);
  const nextMonthStart = yangonDayStart(addYangonMonths(monthStartDay, 1));
  const previousMonthStart = yangonDayStart(addYangonMonths(monthStartDay, -1));
  const seriesStart = addYangonDays(today, -29);
  const weekStartDay = addYangonDays(today, -7 * 11);
  const expiringBefore = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const now = new Date();

  const yangonDate = (column: any) =>
    sql<string>`to_char((${column} AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Yangon', 'YYYY-MM-DD')`;

  const [
    users,
    cardsTotal,
    cardsClaimed,
    orgsTotal,
    orgsCommunity,
    analyticsTotal,
    analyticsToday,
    analyticsByType,
    analyticsTodayByType,
    contactExchanges,
    events,
    liveSubscriptions,
    graceOrExpired,
    dailyActiveToday,
    dailyActiveYesterday,
    designQueue,
    standalonePayments,
    updateRequests,
    expiringInvitations,
    revenueCurrent,
    revenuePrevious,
    newUsersCurrent,
    newUsersPrevious,
    cardsCurrent,
    cardsPrevious,
    invitesSent,
    invitesAccepted,
    invitesSentPrevious,
    invitesAcceptedPrevious,
    dailyActiveSeries,
    analyticsSeries,
    revenueSeries,
  ] = await Promise.all([
    countWhere(user),
    countWhere(card),
    countWhere(card, isNotNull(card.userId)),
    countWhere(organization),
    countWhere(organization, eq(organization.type, ORGANIZATION_TYPES.COMMUNITY)),
    countWhere(analytics),
    countWhere(
      analytics,
      and(gte(analytics.createdAt, todayStart), lt(analytics.createdAt, tomorrowStart))
    ),
    db
      .select({
        type: analytics.type,
        value: count(),
      })
      .from(analytics)
      .groupBy(analytics.type),
    db
      .select({
        type: analytics.type,
        value: count(),
      })
      .from(analytics)
      .where(
        and(gte(analytics.createdAt, todayStart), lt(analytics.createdAt, tomorrowStart))
      )
      .groupBy(analytics.type),
    countWhere(contactExchange),
    countWhere(event),
    countWhere(
      cardSubscription,
      sql`${cardSubscription.status} in ('trial', 'active')`
    ),
    countWhere(
      cardSubscription,
      sql`${cardSubscription.status} in ('grace', 'expired')`
    ),
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
    sumApprovedRevenue(monthStart, nextMonthStart),
    sumApprovedRevenue(previousMonthStart, monthStart),
    countWhere(
      user,
      and(gte(user.createdAt, monthStart), lt(user.createdAt, nextMonthStart))
    ),
    countWhere(
      user,
      and(gte(user.createdAt, previousMonthStart), lt(user.createdAt, monthStart))
    ),
    countWhere(
      card,
      and(gte(card.createdAt, monthStart), lt(card.createdAt, nextMonthStart))
    ),
    countWhere(
      card,
      and(gte(card.createdAt, previousMonthStart), lt(card.createdAt, monthStart))
    ),
    countWhere(
      onboardingInvitation,
      and(
        gte(onboardingInvitation.createdAt, monthStart),
        lt(onboardingInvitation.createdAt, nextMonthStart)
      )
    ),
    countWhere(
      onboardingInvitation,
      and(
        isNotNull(onboardingInvitation.acceptedAt),
        gte(onboardingInvitation.acceptedAt, monthStart),
        lt(onboardingInvitation.acceptedAt, nextMonthStart)
      )
    ),
    countWhere(
      onboardingInvitation,
      and(
        gte(onboardingInvitation.createdAt, previousMonthStart),
        lt(onboardingInvitation.createdAt, monthStart)
      )
    ),
    countWhere(
      onboardingInvitation,
      and(
        isNotNull(onboardingInvitation.acceptedAt),
        gte(onboardingInvitation.acceptedAt, previousMonthStart),
        lt(onboardingInvitation.acceptedAt, monthStart)
      )
    ),
    db
      .select({
        day: userDailyActivity.day,
        value: count(),
      })
      .from(userDailyActivity)
      .where(gte(userDailyActivity.day, seriesStart))
      .groupBy(userDailyActivity.day),
    db
      .select({
        day: yangonDate(analytics.createdAt),
        type: analytics.type,
        value: count(),
      })
      .from(analytics)
      .where(gte(analytics.createdAt, yangonDayStart(seriesStart)))
      .groupBy(yangonDate(analytics.createdAt), analytics.type),
    db
      .select({
        week: sql<string>`to_char(date_trunc('week', (${subscriptionPayment.updatedAt} AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Yangon'), 'YYYY-MM-DD')`,
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
          gte(subscriptionPayment.updatedAt, yangonDayStart(weekStartDay))
        )
      )
      .groupBy(
        sql`date_trunc('week', (${subscriptionPayment.updatedAt} AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Yangon')`
      ),
  ]);

  const byType = emptyAnalyticsTypes();
  for (const row of analyticsByType) {
    if (row.type in byType) byType[row.type as keyof typeof byType] = asNumber(row.value);
  }
  const todayByType = emptyAnalyticsTypes();
  for (const row of analyticsTodayByType) {
    if (row.type in todayByType) {
      todayByType[row.type as keyof typeof todayByType] = asNumber(row.value);
    }
  }

  const oldest = designQueue[0]?.oldest ? new Date(designQueue[0].oldest) : null;
  const oldestAgeHours = oldest
    ? Math.max(0, Math.round((Date.now() - oldest.getTime()) / 36e5))
    : null;

  const days = Array.from({ length: 30 }, (_, index) =>
    addYangonDays(seriesStart, index)
  );
  const activeByDay = new Map(
    dailyActiveSeries.map((row) => [String(row.day), asNumber(row.value)])
  );
  const analyticsByDay = new Map<string, { views: number; other: number }>();
  for (const row of analyticsSeries) {
    const current = analyticsByDay.get(row.day) || { views: 0, other: 0 };
    if (row.type === 'view') current.views += asNumber(row.value);
    else current.other += asNumber(row.value);
    analyticsByDay.set(row.day, current);
  }

  const thisMonday = mondayOnOrBefore(today);
  const uniqueWeeks = Array.from({ length: 12 }, (_, index) =>
    addYangonDays(thisMonday, (index - 11) * 7)
  );
  const revenueByWeek = new Map(
    revenueSeries.map((row) => [row.week, asNumber(row.value)])
  );

  return {
    census: {
      users,
      dailyActive: {
        today: dailyActiveToday,
        yesterday: dailyActiveYesterday,
      },
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
      communities: orgsCommunity,
      analytics: {
        total: analyticsTotal,
        today: analyticsToday,
        byType,
      },
      contactExchanges,
      events,
      liveSubscriptions,
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
      revenue: {
        current: revenueCurrent,
        previous: revenuePrevious,
        currency: 'MMK',
      },
      newUsers: { current: newUsersCurrent, previous: newUsersPrevious },
      cardsCreated: { current: cardsCurrent, previous: cardsPrevious },
      liveSubscriptions,
      graceOrExpired,
      invitations: {
        sent: invitesSent,
        accepted: invitesAccepted,
        previousSent: invitesSentPrevious,
        previousAccepted: invitesAcceptedPrevious,
      },
    },
    series: {
      dailyActive: days.map((day) => ({
        day,
        count: activeByDay.get(day) || 0,
      })),
      analytics: days.map((day) => ({
        day,
        views: analyticsByDay.get(day)?.views || 0,
        other: analyticsByDay.get(day)?.other || 0,
      })),
      revenue: uniqueWeeks.map((week) => ({
        week,
        amountMinor: revenueByWeek.get(week) || 0,
      })),
    },
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

function emptyAnalyticsTypes() {
  return {
    view: 0,
    social_click: 0,
    link_click: 0,
    save_action: 0,
  };
}

async function sumApprovedRevenue(start: Date, end: Date) {
  const [row] = await db
    .select({
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
        gte(subscriptionPayment.updatedAt, start),
        lt(subscriptionPayment.updatedAt, end)
      )
    );
  return asNumber(row?.value);
}
