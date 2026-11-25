import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  max,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  card,
  cardAssignment,
  contactExchange,
  event,
  eventRegistration,
  organization,
  user,
} from '~~/server/db/schema';
import type {
  AdminActivityQuery,
  AdminEventOption,
  AdminPersonActivity,
  AdminPersonEventActivity,
} from '~~/shared/contracts/admin';
import { chartWindow } from './overview.repository';

// A company card changes hands, so the holder at the time (the assignment)
// owns the connection; other cards belong to their user.
const connectionOwnerId = sql<
  string | null
>`coalesce(${cardAssignment.userId}, ${card.userId})`;

function rangeStart(range: AdminActivityQuery['range']) {
  return range === 'all' ? null : chartWindow(range).rangeStart;
}

export async function listPeopleActivity(
  filter: AdminActivityQuery
): Promise<AdminPersonActivity[]> {
  const start = rangeStart(filter.range);

  const connectionWhere: (SQL | undefined)[] = [isNotNull(connectionOwnerId)];
  if (start) connectionWhere.push(gte(contactExchange.createdAt, start));
  if (filter.source)
    connectionWhere.push(eq(contactExchange.source, filter.source));
  if (filter.eventId)
    connectionWhere.push(eq(contactExchange.eventId, filter.eventId));
  if (filter.organizationId) {
    connectionWhere.push(
      or(
        eq(card.organizationId, filter.organizationId),
        eq(event.organizationId, filter.organizationId)
      )
    );
  }

  const registrationWhere: (SQL | undefined)[] = [
    isNotNull(eventRegistration.userId),
  ];
  if (start) registrationWhere.push(gte(event.startsAt, start));
  if (filter.eventId)
    registrationWhere.push(eq(eventRegistration.eventId, filter.eventId));
  if (filter.organizationId)
    registrationWhere.push(eq(event.organizationId, filter.organizationId));

  const [connectionRows, registrationRows] = await Promise.all([
    db
      .select({
        userId: connectionOwnerId,
        connections: count(),
        eventConnections: count(contactExchange.eventId),
        lastConnectionAt: max(contactExchange.createdAt),
      })
      .from(contactExchange)
      .innerJoin(card, eq(card.id, contactExchange.cardId))
      .leftJoin(
        cardAssignment,
        eq(cardAssignment.id, contactExchange.cardAssignmentId)
      )
      .leftJoin(event, eq(event.id, contactExchange.eventId))
      .where(and(...connectionWhere))
      .groupBy(connectionOwnerId),
    // Source only narrows connections; attendance stays whole.
    db
      .select({
        userId: eventRegistration.userId,
        eventsRegistered: count(),
        eventsAttended: sql<number>`count(*) filter (where ${eventRegistration.status} = 'checked_in')`,
      })
      .from(eventRegistration)
      .innerJoin(event, eq(event.id, eventRegistration.eventId))
      .where(and(...registrationWhere))
      .groupBy(eventRegistration.userId),
  ]);

  const byUser = new Map<
    string,
    Omit<AdminPersonActivity, 'name' | 'email' | 'image'>
  >();
  const entry = (userId: string) => {
    let row = byUser.get(userId);
    if (!row) {
      row = {
        userId,
        connections: 0,
        eventConnections: 0,
        eventsRegistered: 0,
        eventsAttended: 0,
        lastConnectionAt: null,
      };
      byUser.set(userId, row);
    }
    return row;
  };
  for (const row of connectionRows) {
    if (!row.userId) continue;
    const target = entry(row.userId);
    target.connections = Number(row.connections);
    target.eventConnections = Number(row.eventConnections);
    target.lastConnectionAt = row.lastConnectionAt
      ? new Date(row.lastConnectionAt).toISOString()
      : null;
  }
  for (const row of registrationRows) {
    if (!row.userId) continue;
    const target = entry(row.userId);
    target.eventsRegistered = Number(row.eventsRegistered);
    target.eventsAttended = Number(row.eventsAttended);
  }
  if (!byUser.size) return [];

  const people = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(user)
    .where(inArray(user.id, [...byUser.keys()]));

  return people.map((person) => ({
    ...byUser.get(person.id)!,
    name: person.name,
    email: person.email,
    image: person.image,
  }));
}

export async function listPersonEventActivity(
  userId: string
): Promise<AdminPersonEventActivity[]> {
  const [registrations, connections] = await Promise.all([
    db
      .select({
        eventId: eventRegistration.eventId,
        status: eventRegistration.status,
        checkedInAt: eventRegistration.checkedInAt,
      })
      .from(eventRegistration)
      .where(eq(eventRegistration.userId, userId)),
    db
      .select({ eventId: contactExchange.eventId, connections: count() })
      .from(contactExchange)
      .innerJoin(card, eq(card.id, contactExchange.cardId))
      .leftJoin(
        cardAssignment,
        eq(cardAssignment.id, contactExchange.cardAssignmentId)
      )
      .where(
        and(eq(connectionOwnerId, userId), isNotNull(contactExchange.eventId))
      )
      .groupBy(contactExchange.eventId),
  ]);

  const eventIds = [
    ...new Set([
      ...registrations.map((row) => row.eventId),
      ...connections.map((row) => row.eventId!),
    ]),
  ];
  if (!eventIds.length) return [];

  const events = await db
    .select({
      id: event.id,
      title: event.title,
      startsAt: event.startsAt,
      organizationName: organization.name,
    })
    .from(event)
    .innerJoin(organization, eq(organization.id, event.organizationId))
    .where(inArray(event.id, eventIds))
    .orderBy(desc(event.startsAt));

  const registrationByEvent = new Map(
    registrations.map((row) => [row.eventId, row])
  );
  const connectionsByEvent = new Map(
    connections.map((row) => [row.eventId!, Number(row.connections)])
  );

  return events.map((item) => {
    const registration = registrationByEvent.get(item.id);
    return {
      eventId: item.id,
      title: item.title,
      startsAt: item.startsAt.toISOString(),
      organizationName: item.organizationName,
      status: registration?.status ?? null,
      checkedInAt: registration?.checkedInAt?.toISOString() ?? null,
      connections: connectionsByEvent.get(item.id) ?? 0,
    };
  });
}

export async function listEventOptions(): Promise<AdminEventOption[]> {
  const rows = await db
    .select({
      id: event.id,
      title: event.title,
      startsAt: event.startsAt,
      organizationId: event.organizationId,
      organizationName: organization.name,
    })
    .from(event)
    .innerJoin(organization, eq(organization.id, event.organizationId))
    .orderBy(desc(event.startsAt), asc(event.title));
  return rows.map((row) => ({ ...row, startsAt: row.startsAt.toISOString() }));
}
