import { and, desc, eq, inArray, ne, or, type SQL } from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  card,
  cardRequest,
  cardSubscription,
  member,
  organization,
  subscriptionPayment,
  subscriptionPaymentItem,
  subscriptionPlan,
  user,
} from '~~/server/db/schema';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

export type CardRecord = typeof card.$inferSelect;

/** Card with its organization and subscription, the shape every card view needs. */
function selectCardsWithContext() {
  return db
    .select({
      card,
      organization: {
        name: organization.name,
        slug: organization.slug,
        type: organization.type,
      },
      subscription: {
        status: cardSubscription.status,
        planCode: cardSubscription.planCode,
        isTrial: cardSubscription.isTrial,
        trialEndAt: cardSubscription.trialEndAt,
        currentPeriodEndAt: cardSubscription.currentPeriodEndAt,
      },
      planName: subscriptionPlan.name,
    })
    .from(card)
    .innerJoin(organization, eq(organization.id, card.organizationId))
    .leftJoin(cardSubscription, eq(cardSubscription.cardId, card.id))
    .leftJoin(
      subscriptionPlan,
      eq(subscriptionPlan.code, cardSubscription.planCode)
    );
}

export async function findCardWithContextBySlug(slug: string) {
  const [row] = await selectCardsWithContext()
    .where(eq(card.slug, slug))
    .limit(1);
  return row ?? null;
}

export type CardWithContext = NonNullable<
  Awaited<ReturnType<typeof findCardWithContextBySlug>>
>;

/** All cards of an organization, or only those held by `holderUserId`. */
export function listCardsInOrganization(
  organizationId: string,
  holderUserId?: string
) {
  return selectCardsWithContext()
    .where(
      and(
        eq(card.organizationId, organizationId),
        holderUserId ? eq(card.userId, holderUserId) : undefined
      )
    )
    .orderBy(desc(card.createdAt));
}

/**
 * The user's workspace: every card in their personal organizations plus the
 * cards they hold in communities.
 */
export async function listWorkspaceCards(userId: string) {
  const memberships = await db
    .select({ organizationId: member.organizationId, type: organization.type })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(eq(member.userId, userId));

  const idsOfType = (type: string) =>
    memberships
      .filter((item) => item.type === type)
      .map((item) => item.organizationId);
  const personalIds = idsOfType(ORGANIZATION_TYPES.PERSONAL);
  const communityIds = idsOfType(ORGANIZATION_TYPES.COMMUNITY);

  const scopes: SQL[] = [];
  if (personalIds.length) scopes.push(inArray(card.organizationId, personalIds));
  if (communityIds.length) {
    scopes.push(
      and(inArray(card.organizationId, communityIds), eq(card.userId, userId))!
    );
  }
  if (!scopes.length) return [];

  return selectCardsWithContext()
    .where(or(...scopes))
    .orderBy(desc(card.createdAt));
}

export async function findCardBySlug(slug: string): Promise<CardRecord | null> {
  const [row] = await db.select().from(card).where(eq(card.slug, slug)).limit(1);
  return row ?? null;
}

export async function findCardById(cardId: string): Promise<CardRecord | null> {
  const [row] = await db.select().from(card).where(eq(card.id, cardId)).limit(1);
  return row ?? null;
}

/** The account email of the card's holder, if the card is claimed. */
export async function findCardOwnerEmail(cardId: string) {
  const [row] = await db
    .select({ email: user.email })
    .from(card)
    .innerJoin(user, eq(user.id, card.userId))
    .where(eq(card.id, cardId))
    .limit(1);
  return row?.email ?? null;
}

/** The user's own card in their personal organization (most recent first). */
export async function findPersonalCardForUser(
  userId: string
): Promise<CardRecord | null> {
  const [row] = await db
    .select({ card })
    .from(card)
    .innerJoin(organization, eq(organization.id, card.organizationId))
    .where(
      and(
        eq(card.userId, userId),
        eq(organization.type, ORGANIZATION_TYPES.PERSONAL)
      )
    )
    .orderBy(desc(card.createdAt))
    .limit(1);
  return row?.card ?? null;
}

export async function findLatestCardInOrganization(
  organizationId: string,
  holderUserId?: string
): Promise<CardRecord | null> {
  const [row] = await db
    .select()
    .from(card)
    .where(
      and(
        eq(card.organizationId, organizationId),
        holderUserId ? eq(card.userId, holderUserId) : undefined
      )
    )
    .orderBy(desc(card.createdAt))
    .limit(1);
  return row ?? null;
}

export async function isCardSlugTaken(slug: string, exceptCardId: string) {
  const [row] = await db
    .select({ id: card.id })
    .from(card)
    .where(and(eq(card.slug, slug), ne(card.id, exceptCardId)))
    .limit(1);
  return !!row;
}

export async function updateCardById(
  cardId: string,
  values: Partial<Omit<CardRecord, 'id' | 'createdAt'>>
) {
  const [updated] = await db
    .update(card)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(card.id, cardId))
    .returning({ id: card.id, slug: card.slug });
  return updated ?? null;
}

const PENDING_REQUEST_NOTE = /^(?:Existing|New) design request \((?<requestId>[^)]+)\)$/;

/**
 * Deletes a card. A card awaiting payment approval also withdraws the
 * holder's pending card requests linked to that payment.
 */
export async function deleteCardWithPendingRequests(
  cardId: string,
  /** Only withdraw this user's requests; omit when Thakhin deletes the card. */
  holderUserId?: string
) {
  await db.transaction(async (tx) => {
    const pendingNotes = await tx
      .select({ note: subscriptionPayment.note, requestId: subscriptionPayment.requestId })
      .from(subscriptionPaymentItem)
      .innerJoin(
        subscriptionPayment,
        eq(subscriptionPayment.id, subscriptionPaymentItem.paymentId)
      )
      .where(
        and(
          eq(subscriptionPaymentItem.cardId, cardId),
          eq(subscriptionPayment.status, 'submitted')
        )
      );

    const requestIds = pendingNotes
      .map(
        (row) =>
          row.requestId ||
          (row.note || '').match(PENDING_REQUEST_NOTE)?.groups?.requestId ||
          null
      )
      .filter((id): id is string => !!id);

    if (requestIds.length) {
      await tx
        .delete(cardRequest)
        .where(
          and(
            inArray(cardRequest.id, requestIds),
            holderUserId ? eq(cardRequest.userId, holderUserId) : undefined,
            eq(cardRequest.status, 'pending')
          )
        );
    }

    await tx.delete(card).where(eq(card.id, cardId));
  });
}
