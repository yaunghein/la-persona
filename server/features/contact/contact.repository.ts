import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  type SQL,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '~~/server/db';
import {
  card,
  contactExchange,
  contactExchangeBeforePlatform,
  contactLabel,
  contactLabelAssignment,
  event,
  organization,
} from '~~/server/db/schema';

const personaCard = alias(card, 'persona_card');

export type ContactScope =
  /** All contacts of an organization's cards, optionally only one owner's cards. */
  | { organizationId: string; cardOwnerUserId?: string }
  /** Contacts of an explicit set of cards (the caller's workspace). */
  | { cardIds: string[] };

export type ContactFilter = {
  cardId?: string;
  eventId?: string;
  /** Contacts carrying any of these labels; only `labelOwnerUserId`'s labels count. */
  labelIds?: string[];
  labelOwnerUserId: string;
  q?: string;
  limit: number;
  offset: number;
};

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function scopeCondition(scope: ContactScope): SQL | undefined {
  if ('cardIds' in scope) {
    return scope.cardIds.length
      ? inArray(contactExchange.cardId, scope.cardIds)
      : undefined;
  }
  return and(
    eq(card.organizationId, scope.organizationId),
    scope.cardOwnerUserId ? eq(card.userId, scope.cardOwnerUserId) : undefined
  );
}

function searchCondition(q: string | undefined): SQL | undefined {
  if (!q) return undefined;
  const pattern = `%${escapeLikePattern(q)}%`;
  return or(
    ilike(contactExchange.name, pattern),
    ilike(contactExchange.phone, pattern),
    ilike(contactExchange.email, pattern),
    ilike(contactExchange.company, pattern),
    ilike(contactExchange.position, pattern),
    ilike(contactExchange.note, pattern),
    ilike(personaCard.firstName, pattern),
    ilike(personaCard.lastName, pattern),
    ilike(personaCard.email, pattern),
    ilike(personaCard.company, pattern),
    ilike(personaCard.position, pattern)
  );
}

function labelCondition(filter: ContactFilter): SQL | undefined {
  if (!filter.labelIds?.length) return undefined;
  return inArray(
    contactExchange.id,
    db
      .select({ id: contactLabelAssignment.contactId })
      .from(contactLabelAssignment)
      .innerJoin(
        contactLabel,
        eq(contactLabel.id, contactLabelAssignment.labelId)
      )
      .where(
        and(
          inArray(contactLabelAssignment.labelId, filter.labelIds),
          eq(contactLabel.userId, filter.labelOwnerUserId)
        )
      )
  );
}

function selectContactRows() {
  return db
    .select({
      contact: contactExchange,
      card: {
        id: card.id,
        slug: card.slug,
        firstName: card.firstName,
        lastName: card.lastName,
      },
      organizationSlug: organization.slug,
      event: { id: event.id, title: event.title, startsAt: event.startsAt },
      personaCard: {
        id: personaCard.id,
        slug: personaCard.slug,
        firstName: personaCard.firstName,
        lastName: personaCard.lastName,
        phone: personaCard.phone,
        phoneCountryCode: personaCard.phoneCountryCode,
        email: personaCard.email,
        company: personaCard.company,
        position: personaCard.position,
      },
    })
    .from(contactExchange)
    .innerJoin(card, eq(contactExchange.cardId, card.id))
    .innerJoin(organization, eq(card.organizationId, organization.id))
    .leftJoin(personaCard, eq(contactExchange.laPersonaCardId, personaCard.id))
    .leftJoin(event, eq(contactExchange.eventId, event.id));
}

export async function listContacts(scope: ContactScope, filter: ContactFilter) {
  const scoped = scopeCondition(scope);
  if (!scoped) return { rows: [], total: 0 };

  const where = and(
    scoped,
    filter.cardId ? eq(contactExchange.cardId, filter.cardId) : undefined,
    filter.eventId ? eq(contactExchange.eventId, filter.eventId) : undefined,
    labelCondition(filter),
    searchCondition(filter.q)
  );

  const [rows, [totals]] = await Promise.all([
    selectContactRows()
      .where(where)
      .orderBy(desc(contactExchange.createdAt))
      .limit(filter.limit)
      .offset(filter.offset),
    db
      .select({ total: count() })
      .from(contactExchange)
      .innerJoin(card, eq(contactExchange.cardId, card.id))
      .leftJoin(
        personaCard,
        eq(contactExchange.laPersonaCardId, personaCard.id)
      )
      .where(where),
  ]);

  return { rows, total: totals?.total ?? 0 };
}

export type ContactRow = Awaited<
  ReturnType<typeof listContacts>
>['rows'][number];

export async function getContactRow(contactId: string) {
  const [row] = await selectContactRows()
    .where(eq(contactExchange.id, contactId))
    .limit(1);
  if (!row) throw notFound('Contact');
  return row;
}

/** The contact with the card that owns it, for authorization. */
export async function findContactOwnership(contactId: string) {
  const [row] = await db
    .select({
      id: contactExchange.id,
      cardId: card.id,
      cardOrganizationId: card.organizationId,
      cardUserId: card.userId,
      source: contactExchange.source,
    })
    .from(contactExchange)
    .innerJoin(card, eq(contactExchange.cardId, card.id))
    .where(eq(contactExchange.id, contactId))
    .limit(1);
  return row ?? null;
}

/** The distinct events on contacts in scope, newest first, for the "where you met" filter. */
export async function listContactEvents(scope: ContactScope) {
  const scoped = scopeCondition(scope);
  if (!scoped) return [];
  return db
    .selectDistinct({
      id: event.id,
      title: event.title,
      startsAt: event.startsAt,
    })
    .from(contactExchange)
    .innerJoin(card, eq(contactExchange.cardId, card.id))
    .innerJoin(event, eq(contactExchange.eventId, event.id))
    .where(scoped)
    .orderBy(desc(event.startsAt));
}

export async function updateContact(
  contactId: string,
  values: Partial<
    Pick<
      typeof contactExchange.$inferInsert,
      | 'note'
      | 'eventId'
      | 'name'
      | 'position'
      | 'company'
      | 'phone'
      | 'phoneCountryCode'
      | 'email'
    >
  >
) {
  await db
    .update(contactExchange)
    .set(values)
    .where(eq(contactExchange.id, contactId));
}

export async function deleteContact(contactId: string) {
  await db.delete(contactExchange).where(eq(contactExchange.id, contactId));
}

export async function insertContact(
  values: typeof contactExchange.$inferInsert
) {
  const [inserted] = await db
    .insert(contactExchange)
    .values(values)
    .returning();
  if (!inserted) throw new Error('Contact insert returned no row.');
  return inserted;
}

type SeamlessContactValues = {
  cardId: string;
  name: string;
  phone: string;
  phoneCountryCode: string | null;
  email: string | null;
  company: string | null;
  position: string | null;
  laPersonaUserId: string | null;
  laPersonaCardId: string;
  eventId: string | null;
};

/**
 * Saves both directions of a seamless exchange in one transaction and links
 * them as reciprocal. Re-exchanging updates the existing pair.
 */
export async function upsertSeamlessExchange(
  ownerSide: SeamlessContactValues,
  visitorSide: SeamlessContactValues
) {
  return db.transaction(async (tx) => {
    const upsert = async (values: SeamlessContactValues) => {
      const row = { ...values, source: 'seamless_exchange' as const };
      // A re-exchange away from an event keeps where they first met.
      const { eventId, ...withoutEvent } = row;
      const [saved] = await tx
        .insert(contactExchange)
        .values(row)
        .onConflictDoUpdate({
          target: [contactExchange.cardId, contactExchange.laPersonaUserId],
          set: { ...(eventId ? row : withoutEvent), updatedAt: new Date() },
        })
        .returning({ id: contactExchange.id });
      if (!saved) throw new Error('Seamless exchange upsert returned no row.');
      return saved.id;
    };

    const ownerContactId = await upsert(ownerSide);
    const visitorContactId = await upsert(visitorSide);

    await Promise.all([
      tx
        .update(contactExchange)
        .set({ reciprocalExchangeId: visitorContactId, updatedAt: new Date() })
        .where(eq(contactExchange.id, ownerContactId)),
      tx
        .update(contactExchange)
        .set({ reciprocalExchangeId: ownerContactId, updatedAt: new Date() })
        .where(eq(contactExchange.id, visitorContactId)),
    ]);

    return { ownerContactId, visitorContactId };
  });
}

export async function insertLegacyContactExchange(
  values: typeof contactExchangeBeforePlatform.$inferInsert
) {
  const [inserted] = await db
    .insert(contactExchangeBeforePlatform)
    .values(values)
    .returning({ id: contactExchangeBeforePlatform.id });
  if (!inserted) throw new Error('Legacy contact insert returned no row.');
  return inserted;
}

/** Connections made at an event, for the event overview. */
export async function countContactsByEventId(eventId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(contactExchange)
    .where(eq(contactExchange.eventId, eventId));
  return row?.value ?? 0;
}

/** Contacts per card, for member "connections" counts. */
export async function countContactsByCardIds(cardIds: string[]) {
  if (!cardIds.length) return new Map<string, number>();
  const rows = await db
    .select({ cardId: contactExchange.cardId, value: count() })
    .from(contactExchange)
    .where(inArray(contactExchange.cardId, cardIds))
    .groupBy(contactExchange.cardId);
  return new Map(
    rows.flatMap((row) =>
      row.cardId ? [[row.cardId, Number(row.value)] as const] : []
    )
  );
}
