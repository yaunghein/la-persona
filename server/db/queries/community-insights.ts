import {
  and,
  count,
  countDistinct,
  eq,
  gte,
  inArray,
  isNotNull,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import { db } from '../../db';
import {
  event,
  eventRegistration,
  member,
} from '../schema';
import {
  ANALYTICS_PERIOD_OPTIONS,
  analyticsPeriodDays,
  analyticsPeriodStart,
  type AnalyticsPeriod,
} from '../../../shared/utils/analytics-period';
import {
  viewerRecentDays,
  type TimezoneOffset,
} from '../../../shared/utils/datetime';
import type { CommunityInsightsData } from '../../../shared/types/community-insights';
import { viewerDaySql } from '../../utils/request-timezone';

const COMPLETED_REGISTRATION_STATUSES = ['registered', 'checked_in'] as const;

function formatCount(value: number) {
  return value.toLocaleString('en-US');
}

function formatAttendance(checkedIn: number, registered: number) {
  if (registered <= 0) return '—';
  return `${Math.round((checkedIn / registered) * 100)}%`;
}

const COMMUNITY_INSIGHTS_INFO = [
  {
    icon: 'i-lucide-users',
    title: 'Track Membership',
    description:
      'See total, active, and new members across your organization.',
  },
  {
    icon: 'i-lucide-calendar',
    title: 'Measure Events',
    description: 'Compare registrations, check-ins, and attendance by event.',
  },
  {
    icon: 'i-lucide-trending-up',
    title: 'Follow Growth',
    description: 'Watch how your community grows over the selected period.',
  },
];

export async function getCommunityInsights(
  organizationId: string,
  period: AnalyticsPeriod,
  timezoneOffset?: TimezoneOffset
): Promise<CommunityInsightsData> {
  const now = new Date();
  const since = analyticsPeriodStart(period, now);
  const eventWindow = and(
    eq(event.organizationId, organizationId),
    gte(event.startsAt, since),
    lte(event.startsAt, now)
  );

  const [
    totalMembersRow,
    newMembersRow,
    dailyJoins,
    totalEventsRow,
    registrationsRow,
    activeMembersRow,
    eventRows,
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(member)
      .where(eq(member.organizationId, organizationId))
      .then((rows) => rows[0]),
    db
      .select({ value: count() })
      .from(member)
      .where(
        and(
          eq(member.organizationId, organizationId),
          gte(member.createdAt, since)
        )
      )
      .then((rows) => rows[0]),
    db
      .select({
        date: viewerDaySql(member.createdAt, timezoneOffset).as('day'),
        value: count(),
      })
      .from(member)
      .where(
        and(
          eq(member.organizationId, organizationId),
          gte(member.createdAt, since)
        )
      )
      .groupBy(sql`day`)
      .orderBy(sql`day`),
    db
      .select({ value: count() })
      .from(event)
      .where(eventWindow)
      .then((rows) => rows[0]),
    db
      .select({ value: count() })
      .from(eventRegistration)
      .innerJoin(event, eq(event.id, eventRegistration.eventId))
      .where(
        and(
          eq(event.organizationId, organizationId),
          gte(eventRegistration.registeredAt, since),
          inArray(eventRegistration.status, [...COMPLETED_REGISTRATION_STATUSES])
        )
      )
      .then((rows) => rows[0]),
    db
      .select({ value: countDistinct(eventRegistration.userId) })
      .from(eventRegistration)
      .innerJoin(event, eq(event.id, eventRegistration.eventId))
      .where(
        and(
          eq(event.organizationId, organizationId),
          inArray(eventRegistration.status, [...COMPLETED_REGISTRATION_STATUSES]),
          or(
            gte(eventRegistration.registeredAt, since),
            and(
              isNotNull(eventRegistration.checkedInAt),
              gte(eventRegistration.checkedInAt, since)
            )
          )
        )
      )
      .then((rows) => rows[0]),
    db
      .select({
        id: event.id,
        title: event.title,
        registered: sql<number>`count(${eventRegistration.id}) filter (where ${eventRegistration.status} in ('registered', 'checked_in'))::int`,
        checkedIn: sql<number>`count(${eventRegistration.id}) filter (where ${eventRegistration.status} = 'checked_in')::int`,
      })
      .from(event)
      .leftJoin(
        eventRegistration,
        eq(eventRegistration.eventId, event.id)
      )
      .where(eventWindow)
      .groupBy(event.id, event.title, event.startsAt)
      .orderBy(sql`${event.startsAt} desc`),
  ]);

  const totalMembers = Number(totalMembersRow?.value ?? 0);
  const newMembers = Number(newMembersRow?.value ?? 0);
  const totalEvents = Number(totalEventsRow?.value ?? 0);
  const registrations = Number(registrationsRow?.value ?? 0);
  const activeMembers = Number(activeMembersRow?.value ?? 0);

  const eventPerformance = eventRows.map((row) => {
    const registered = Number(row.registered ?? 0);
    const checkedIn = Number(row.checkedIn ?? 0);
    return {
      id: row.id,
      event: row.title,
      registered,
      checkedIn,
      attendance: formatAttendance(checkedIn, registered),
    };
  });

  const periodRegistered = eventPerformance.reduce(
    (sum, row) => sum + row.registered,
    0
  );
  const periodCheckedIn = eventPerformance.reduce(
    (sum, row) => sum + row.checkedIn,
    0
  );

  const joinsByDay = new Map(
    dailyJoins.map((row) => [row.date, Number(row.value ?? 0)])
  );

  const memberGrowthDays = viewerRecentDays(
    analyticsPeriodDays(period) + 1,
    timezoneOffset
  );
  const memberGrowth = {
    labels: memberGrowthDays.map((day) => day.label),
    values: memberGrowthDays.map((day) => joinsByDay.get(day.key) ?? 0),
  };

  return {
    title: 'Community Insights',
    periodOptions: ANALYTICS_PERIOD_OPTIONS,
    metrics: [
      { label: 'Total Members', value: formatCount(totalMembers) },
      { label: 'Total Events', value: formatCount(totalEvents) },
      { label: 'Active Members', value: formatCount(activeMembers) },
      { label: 'Registrations', value: formatCount(registrations) },
      {
        label: 'Average Attendance Rate',
        value: formatAttendance(periodCheckedIn, periodRegistered),
      },
      {
        label: 'New Members',
        value: newMembers > 0 ? `+${formatCount(newMembers)}` : formatCount(newMembers),
      },
    ],
    memberGrowth,
    eventPerformance,
    infoItems: COMMUNITY_INSIGHTS_INFO,
  };
}
