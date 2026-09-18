import { and, count, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from '../../db';
import { event, eventRegistration, member, card, user } from '../schema';
import type {
  EventOverviewStats,
  EventRegistrationStatus,
  ViewerRegistrationStatus,
} from '~~/shared/types/event';
import type { EventAttendee } from '~~/shared/types/community-event-detail';

const COUNTED_STATUSES: EventRegistrationStatus[] = [
  'registered',
  'checked_in',
];

export async function findRegistrationByEventAndUser(
  eventId: string,
  userId: string
) {
  const [row] = await db
    .select()
    .from(eventRegistration)
    .where(
      and(
        eq(eventRegistration.eventId, eventId),
        eq(eventRegistration.userId, userId)
      )
    )
    .limit(1);

  return row ?? null;
}

export async function findRegistrationByIdAndEvent(
  registrationId: string,
  eventId: string
) {
  const [row] = await db
    .select()
    .from(eventRegistration)
    .where(
      and(
        eq(eventRegistration.id, registrationId),
        eq(eventRegistration.eventId, eventId)
      )
    )
    .limit(1);

  return row ?? null;
}

export async function countCountedRegistrations(eventId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(eventRegistration)
    .where(
      and(
        eq(eventRegistration.eventId, eventId),
        inArray(eventRegistration.status, COUNTED_STATUSES)
      )
    );

  return row?.value ?? 0;
}

export async function countCheckedInRegistrations(eventId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(eventRegistration)
    .where(
      and(
        eq(eventRegistration.eventId, eventId),
        eq(eventRegistration.status, 'checked_in')
      )
    );

  return row?.value ?? 0;
}

export async function countRegistrationsByEventIds(eventIds: string[]) {
  if (eventIds.length === 0) return new Map<string, number>();

  const rows = await db
    .select({
      eventId: eventRegistration.eventId,
      value: count(),
    })
    .from(eventRegistration)
    .where(
      and(
        inArray(eventRegistration.eventId, eventIds),
        inArray(eventRegistration.status, COUNTED_STATUSES)
      )
    )
    .groupBy(eventRegistration.eventId);

  return new Map(rows.map((row) => [row.eventId, row.value]));
}

export async function findViewerRegistrations(
  eventIds: string[],
  userId: string
) {
  if (eventIds.length === 0) return new Map<string, EventRegistrationStatus>();

  const rows = await db
    .select({
      eventId: eventRegistration.eventId,
      status: eventRegistration.status,
    })
    .from(eventRegistration)
    .where(
      and(
        inArray(eventRegistration.eventId, eventIds),
        eq(eventRegistration.userId, userId)
      )
    );

  return new Map(rows.map((row) => [row.eventId, row.status]));
}

export function toViewerStatus(
  status: EventRegistrationStatus | undefined
): ViewerRegistrationStatus {
  return status ?? 'none';
}

export async function insertEventRegistration(values: {
  eventId: string;
  userId: string;
  status: EventRegistrationStatus;
}) {
  const [inserted] = await db
    .insert(eventRegistration)
    .values(values)
    .returning();
  return inserted;
}

export async function deleteEventRegistration(eventId: string, userId: string) {
  const [deleted] = await db
    .delete(eventRegistration)
    .where(
      and(
        eq(eventRegistration.eventId, eventId),
        eq(eventRegistration.userId, userId)
      )
    )
    .returning({ id: eventRegistration.id, status: eventRegistration.status });

  return deleted ?? null;
}

export async function updateEventRegistrationStatus(
  registrationId: string,
  status: EventRegistrationStatus,
  extra: { checkedInAt?: Date | null } = {}
) {
  const [updated] = await db
    .update(eventRegistration)
    .set({
      status,
      ...(extra.checkedInAt !== undefined
        ? { checkedInAt: extra.checkedInAt }
        : {}),
    })
    .where(eq(eventRegistration.id, registrationId))
    .returning();

  return updated ?? null;
}

export async function deleteRegistrationsForUserInOrganization(
  userId: string,
  organizationId: string
) {
  const eventRows = await db
    .select({ id: event.id })
    .from(event)
    .where(eq(event.organizationId, organizationId));

  const eventIds = eventRows.map((row) => row.id);
  if (eventIds.length === 0) return;

  await db
    .delete(eventRegistration)
    .where(
      and(
        eq(eventRegistration.userId, userId),
        inArray(eventRegistration.eventId, eventIds)
      )
    );
}

export async function countCheckedInByUsersInOrganization(
  userIds: string[],
  organizationId: string
) {
  if (userIds.length === 0) return new Map<string, number>();

  const rows = await db
    .select({
      userId: eventRegistration.userId,
      value: count(),
    })
    .from(eventRegistration)
    .innerJoin(event, eq(event.id, eventRegistration.eventId))
    .where(
      and(
        eq(event.organizationId, organizationId),
        eq(eventRegistration.status, 'checked_in'),
        inArray(eventRegistration.userId, userIds)
      )
    )
    .groupBy(eventRegistration.userId);

  return new Map(rows.map((row) => [row.userId, Number(row.value)]));
}

export async function countCheckedInByUserInOrganization(
  userId: string,
  organizationId: string
) {
  const [row] = await db
    .select({ value: count() })
    .from(eventRegistration)
    .innerJoin(event, eq(event.id, eventRegistration.eventId))
    .where(
      and(
        eq(eventRegistration.userId, userId),
        eq(event.organizationId, organizationId),
        eq(eventRegistration.status, 'checked_in')
      )
    );

  return row?.value ?? 0;
}

export async function countMembersJoinedSince(
  organizationId: string,
  since: Date
) {
  const [row] = await db
    .select({ value: count() })
    .from(member)
    .where(
      and(
        eq(member.organizationId, organizationId),
        gte(member.createdAt, since)
      )
    );

  return row?.value ?? 0;
}

export async function getRegistrationTrend(eventId: string) {
  const labels: string[] = [];
  const values: number[] = [];
  const now = new Date();

  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - offset);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);

    const [row] = await db
      .select({ value: count() })
      .from(eventRegistration)
      .where(
        and(
          eq(eventRegistration.eventId, eventId),
          gte(eventRegistration.registeredAt, day),
          sql`${eventRegistration.registeredAt} < ${next}`
        )
      );

    labels.push(
      day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    );
    values.push(row?.value ?? 0);
  }

  return { labels, values };
}

export async function buildEventOverview(
  eventId: string,
  organizationId: string,
  eventCreatedAt: Date
): Promise<EventOverviewStats> {
  const [registrations, checkedIn, newMembersJoined, registrationTrend] =
    await Promise.all([
      countCountedRegistrations(eventId),
      countCheckedInRegistrations(eventId),
      countMembersJoinedSince(organizationId, eventCreatedAt),
      getRegistrationTrend(eventId),
    ]);

  const attendanceRate =
    registrations === 0
      ? '—'
      : `${Math.round((checkedIn / registrations) * 100)}%`;

  return {
    registrations,
    checkedIn,
    attendanceRate,
    newMembersJoined,
    registrationTrend,
  };
}

function formatDateLabel(value: Date) {
  return value.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

function formatTimeLabel(value: Date | null) {
  if (!value) return null;
  return value.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function attendeeStatusLabel(
  status: EventRegistrationStatus,
  checkedInAt: Date | null
) {
  if (status === 'checked_in') {
    const time = formatTimeLabel(checkedInAt);
    return time ? `Checked-in at ${time}` : 'Checked-in';
  }
  if (status === 'pending') return 'Pending approval';
  return 'Registered';
}

export async function listEventAttendees(
  eventId: string,
  organizationId: string
): Promise<EventAttendee[]> {
  const rows = await db
    .select({
      registration: eventRegistration,
      user,
      member,
      card,
    })
    .from(eventRegistration)
    .innerJoin(user, eq(user.id, eventRegistration.userId))
    .leftJoin(
      member,
      and(
        eq(member.userId, eventRegistration.userId),
        eq(member.organizationId, organizationId)
      )
    )
    .leftJoin(
      card,
      and(
        eq(card.userId, eventRegistration.userId),
        eq(card.organizationId, organizationId)
      )
    )
    .where(eq(eventRegistration.eventId, eventId))
    .orderBy(desc(eventRegistration.registeredAt));

  const checkInCounts = await countCheckedInByUsersInOrganization(
    rows.map((row) => row.user.id),
    organizationId
  );

  return rows.map((row) => {
    const firstName = row.card?.firstName || row.user.name;
    const lastName = row.card?.lastName || '';
    const name = [firstName, lastName].filter(Boolean).join(' ').trim();

    return {
      id: row.registration.id,
      name,
      role: row.card?.position || 'Member',
      company: row.card?.company || '',
      status: row.registration.status,
      statusLabel: attendeeStatusLabel(
        row.registration.status,
        row.registration.checkedInAt
      ),
      membershipStatus: row.member ? 'Active' : 'Guest',
      joinedAt: row.member ? formatDateLabel(row.member.createdAt) : '—',
      registeredAt: formatDateLabel(row.registration.registeredAt),
      checkedInAt: formatTimeLabel(row.registration.checkedInAt),
      eventsAttended: checkInCounts.get(row.user.id) ?? 0,
      connectionsMade: 0,
      phone: row.card?.phone || undefined,
      email: row.card?.email || row.user.email,
      avatarUrl: row.card?.avatarUrl || row.user.image || undefined,
      cardSlug: row.card?.slug || undefined,
      splineUrl: row.card?.splineUrl || null,
    };
  });
}
