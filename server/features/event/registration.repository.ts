import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  lt,
  lte,
  ne,
  sql,
} from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  attendeeLabel,
  event,
  eventRegistration,
  member,
  card,
  registrationLabel,
  user,
} from '~~/server/db/schema';
import { countContactsByEventId } from '~~/server/features/contact/contact.repository';
import { listLabelsByRegistrationIds } from '~~/server/features/event/attendee-label.repository';
import type {
  EventOverviewStats,
  EventRegistrationStatus,
  ViewerRegistrationStatus,
} from '~~/shared/contracts/event';
import type { EventAttendee } from '~~/shared/contracts/event';
import {
  viewerDaysBetween,
  type TimezoneOffset,
} from '~~/shared/utils/datetime';
import { viewerDaySql } from '~~/server/utils/request-timezone';

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

// People exchange cards in the lobby before doors open and linger after the end.
const LIVE_EVENT_SLACK_MS = 2 * 60 * 60 * 1000;

/** The live event one of these users is checked in at, newest first; drives "where you met". */
export async function findLiveCheckedInEventId(userIds: string[], now: Date) {
  if (userIds.length === 0) return null;
  const [row] = await db
    .select({ id: event.id })
    .from(eventRegistration)
    .innerJoin(event, eq(eventRegistration.eventId, event.id))
    .where(
      and(
        inArray(eventRegistration.userId, userIds),
        eq(eventRegistration.status, 'checked_in'),
        lte(event.startsAt, new Date(now.getTime() + LIVE_EVENT_SLACK_MS)),
        gte(event.endsAt, new Date(now.getTime() - LIVE_EVENT_SLACK_MS))
      )
    )
    .orderBy(desc(event.startsAt))
    .limit(1);
  return row?.id ?? null;
}

/** Events the user registered for, newest first; the choices for a contact's "where you met". */
export async function listRegisteredEvents(userId: string) {
  return db
    .select({ id: event.id, title: event.title, startsAt: event.startsAt })
    .from(eventRegistration)
    .innerJoin(event, eq(eventRegistration.eventId, event.id))
    .where(eq(eventRegistration.userId, userId))
    .orderBy(desc(event.startsAt))
    .limit(100);
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

export async function countMembersJoinedBetween(
  organizationId: string,
  from: Date,
  until: Date
) {
  if (until <= from) return 0;

  const [row] = await db
    .select({ value: count() })
    .from(member)
    .where(
      and(
        eq(member.organizationId, organizationId),
        gte(member.createdAt, from),
        lt(member.createdAt, until)
      )
    );

  return row?.value ?? 0;
}

export async function getRegistrationTrend(
  eventId: string,
  eventCreatedAt: Date,
  eventEndsAt: Date,
  timezoneOffset?: TimezoneOffset
) {
  const days = viewerDaysBetween(eventCreatedAt, eventEndsAt, timezoneOffset);
  const first = days[0];
  const last = days[days.length - 1];
  if (!first || !last) return { labels: [], values: [] };

  const rows = await db
    .select({
      date: viewerDaySql(eventRegistration.registeredAt, timezoneOffset).as(
        'day'
      ),
      value: count(),
    })
    .from(eventRegistration)
    .where(
      and(
        eq(eventRegistration.eventId, eventId),
        inArray(eventRegistration.status, COUNTED_STATUSES),
        gte(eventRegistration.registeredAt, first.start),
        lt(eventRegistration.registeredAt, last.end)
      )
    )
    .groupBy(sql`day`);

  const byDay = new Map(rows.map((row) => [row.date, Number(row.value ?? 0)]));

  return {
    labels: days.map((day) => day.label),
    values: days.map((day) => byDay.get(day.key) ?? 0),
  };
}

export async function buildEventOverview(
  eventId: string,
  organizationId: string,
  eventCreatedAt: Date,
  eventEndsAt: Date,
  timezoneOffset?: TimezoneOffset
): Promise<EventOverviewStats> {
  const eventDay = viewerDaysBetween(
    eventEndsAt,
    eventEndsAt,
    timezoneOffset
  )[0];
  const membersUntil = eventDay?.end ?? eventEndsAt;

  const [
    registrations,
    checkedIn,
    newMembersJoined,
    connectionsMade,
    registrationTrend,
  ] = await Promise.all([
    countCountedRegistrations(eventId),
    countCheckedInRegistrations(eventId),
    countMembersJoinedBetween(organizationId, eventCreatedAt, membersUntil),
    countContactsByEventId(eventId),
    getRegistrationTrend(eventId, eventCreatedAt, eventEndsAt, timezoneOffset),
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
    connectionsMade,
    registrationTrend,
  };
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
    .leftJoin(user, eq(user.id, eventRegistration.userId))
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
    .orderBy(desc(eventRegistration.createdAt), desc(eventRegistration.id));

  const [checkInCounts, labels] = await Promise.all([
    countCheckedInByUsersInOrganization(
      rows.flatMap((row) => (row.user ? [row.user.id] : [])),
      organizationId
    ),
    listLabelsByRegistrationIds(rows.map((row) => row.registration.id)),
  ]);

  return rows.map((row): EventAttendee => {
    const { registration } = row;
    if (!row.user) {
      return {
        id: registration.id,
        name: registration.guestName ?? '',
        role: registration.guestPosition ?? '',
        company: registration.guestCompany ?? '',
        status: registration.status,
        membershipStatus: 'Guest',
        joinedAt: null,
        registeredAt: registration.registeredAt.toISOString(),
        checkedInAt: registration.checkedInAt?.toISOString() ?? null,
        eventsAttended: 0,
        connectionsMade: 0,
        phone: registration.guestPhone ?? undefined,
        phoneCountryCode: registration.guestPhoneCountryCode,
        note: registration.guestNote,
        hasEmail: false,
        labels: labels.get(registration.id) ?? [],
      };
    }

    const firstName = row.card?.firstName || row.user.name;
    const lastName = row.card?.lastName || '';
    const name = [firstName, lastName].filter(Boolean).join(' ').trim();

    return {
      id: row.registration.id,
      name,
      role: row.card?.position || 'Member',
      company: row.card?.company || '',
      status: row.registration.status,
      membershipStatus: row.member ? 'Active' : 'Guest',
      joinedAt: row.member?.createdAt.toISOString() ?? null,
      registeredAt: row.registration.registeredAt.toISOString(),
      checkedInAt: row.registration.checkedInAt?.toISOString() ?? null,
      eventsAttended: checkInCounts.get(row.user.id) ?? 0,
      connectionsMade: 0,
      phone: row.card?.phone || undefined,
      email: row.card?.email || row.user.email,
      avatarUrl: row.card?.avatarUrl || row.user.image || undefined,
      cardSlug: row.card?.slug || undefined,
      splineUrl: row.card?.splineUrl || null,
      hasEmail: true,
      labels: labels.get(row.registration.id) ?? [],
    };
  });
}

/**
 * Places a registration while holding a row lock on the event, so concurrent
 * sign-ups cannot exceed capacity. Pending (manual approval) registrations do
 * not take a seat. Returns 'full' when no seat is left.
 *
 * The new registration starts with the carry-over labels of the person's
 * latest earlier registration in the same community. This copy happens once;
 * later label edits never touch other events.
 */
export async function insertRegistrationWithinCapacity(values: {
  eventId: string;
  userId: string;
  status: EventRegistrationStatus;
}) {
  return db.transaction(async (tx) => {
    const [locked] = await tx
      .select({
        capacity: event.capacity,
        organizationId: event.organizationId,
      })
      .from(event)
      .where(eq(event.id, values.eventId))
      .for('update');
    if (!locked) return 'not_found' as const;

    if (locked.capacity != null && COUNTED_STATUSES.includes(values.status)) {
      const [taken] = await tx
        .select({ value: count() })
        .from(eventRegistration)
        .where(
          and(
            eq(eventRegistration.eventId, values.eventId),
            inArray(eventRegistration.status, COUNTED_STATUSES)
          )
        );
      if ((taken?.value ?? 0) >= locked.capacity) return 'full' as const;
    }

    const [inserted] = await tx
      .insert(eventRegistration)
      .values(values)
      .returning();
    if (!inserted) return null;

    const [previous] = await tx
      .select({ id: eventRegistration.id })
      .from(eventRegistration)
      .innerJoin(event, eq(event.id, eventRegistration.eventId))
      .where(
        and(
          eq(eventRegistration.userId, values.userId),
          eq(event.organizationId, locked.organizationId),
          ne(eventRegistration.id, inserted.id)
        )
      )
      .orderBy(desc(eventRegistration.registeredAt))
      .limit(1);
    if (previous) {
      const carried = await tx
        .select({ labelId: registrationLabel.labelId })
        .from(registrationLabel)
        .innerJoin(
          attendeeLabel,
          eq(attendeeLabel.id, registrationLabel.labelId)
        )
        .where(
          and(
            eq(registrationLabel.registrationId, previous.id),
            eq(attendeeLabel.carriesOver, true)
          )
        );
      if (carried.length) {
        await tx.insert(registrationLabel).values(
          carried.map((row) => ({
            registrationId: inserted.id,
            labelId: row.labelId,
          }))
        );
      }
    }
    return inserted;
  });
}

/** A walk-in with no account, checked in as staff save them. */
export async function insertWalkInRegistration(values: {
  eventId: string;
  createdByUserId: string;
  guestName: string;
  guestPhone: string | null;
  guestPhoneCountryCode: string | null;
  guestCompany: string | null;
  guestPosition: string | null;
  guestNote: string | null;
}) {
  const now = new Date();
  const [inserted] = await db
    .insert(eventRegistration)
    .values({
      ...values,
      status: 'checked_in',
      registeredAt: now,
      checkedInAt: now,
    })
    .returning();
  return inserted!;
}

/** Moves a pending registration to registered if a seat is still free. */
export async function confirmRegistrationWithinCapacity(
  registrationId: string,
  eventId: string
) {
  return db.transaction(async (tx) => {
    const [locked] = await tx
      .select({ capacity: event.capacity })
      .from(event)
      .where(eq(event.id, eventId))
      .for('update');
    if (!locked) return 'not_found' as const;

    if (locked.capacity != null) {
      const [taken] = await tx
        .select({ value: count() })
        .from(eventRegistration)
        .where(
          and(
            eq(eventRegistration.eventId, eventId),
            inArray(eventRegistration.status, COUNTED_STATUSES)
          )
        );
      if ((taken?.value ?? 0) >= locked.capacity) return 'full' as const;
    }

    const [updated] = await tx
      .update(eventRegistration)
      .set({ status: 'registered' })
      .where(
        and(
          eq(eventRegistration.id, registrationId),
          eq(eventRegistration.status, 'pending')
        )
      )
      .returning();
    return updated ?? null;
  });
}

export async function findRegistrationById(registrationId: string) {
  const [row] = await db
    .select()
    .from(eventRegistration)
    .where(eq(eventRegistration.id, registrationId))
    .limit(1);
  return row ?? null;
}
