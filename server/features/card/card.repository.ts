import {
  and,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  ne,
  or,
  type SQL,
} from 'drizzle-orm';
import { db } from '~~/server/db';
import type { Transaction } from '~~/server/features/billing/billing.repository';
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
    .where(and(eq(card.slug, slug), isNull(card.removedAt)))
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
        isNull(card.removedAt),
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
  const companyIds = idsOfType(ORGANIZATION_TYPES.COMPANY);

  const scopes: SQL[] = [];
  if (personalIds.length)
    scopes.push(inArray(card.organizationId, personalIds));
  // Community and company cards count only while the user holds them.
  const heldIds = [...communityIds, ...companyIds];
  if (heldIds.length) {
    scopes.push(
      and(inArray(card.organizationId, heldIds), eq(card.userId, userId))!
    );
  }
  if (!scopes.length) return [];

  return selectCardsWithContext()
    .where(and(or(...scopes), isNull(card.removedAt)))
    .orderBy(desc(card.createdAt));
}

/**
 * Cards whose contacts the user sees: their workspace cards plus cards they
 * removed or held in a community they left, so leaving never loses contacts.
 */
export async function listContactCardIds(userId: string) {
  const [workspace, removed] = await Promise.all([
    listWorkspaceCards(userId),
    db
      .select({ id: card.id })
      .from(card)
      .innerJoin(organization, eq(organization.id, card.organizationId))
      .where(
        and(
          eq(card.userId, userId),
          ne(organization.type, ORGANIZATION_TYPES.COMPANY),
          isNotNull(card.removedAt)
        )
      ),
  ]);
  return [
    ...workspace.map((row) => row.card.id),
    ...removed.map((row) => row.id),
  ];
}

export async function findCardBySlug(slug: string): Promise<CardRecord | null> {
  const [row] = await db
    .select()
    .from(card)
    .where(and(eq(card.slug, slug), isNull(card.removedAt)))
    .limit(1);
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
        isNull(card.removedAt),
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
  if (row) return true;
  const { retiredCardSlug } = await import('~~/server/db/schema');
  const [retired] = await db
    .select({ slug: retiredCardSlug.slug })
    .from(retiredCardSlug)
    .where(eq(retiredCardSlug.slug, slug))
    .limit(1);
  return Boolean(retired);
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

const PENDING_REQUEST_NOTE =
  /^(?:Existing|New) design request \((?<requestId>[^)]+)\)$/;

/**
 * Withdraws what waits on a card's submitted payments: the holder's pending
 * card requests linked to them. Returns those payments' ids.
 */
async function withdrawPendingRequests(
  tx: Transaction,
  cardId: string,
  /** Only withdraw this user's requests; omit when Thakhin deletes the card. */
  holderUserId?: string
) {
  const pending = await tx
    .select({
      id: subscriptionPayment.id,
      note: subscriptionPayment.note,
      requestId: subscriptionPayment.requestId,
    })
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

  const requestIds = pending
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
  return pending.map((row) => row.id);
}

/** Thakhin purges a card, and with it everything that references it. */
export async function deleteCardWithPendingRequests(cardId: string) {
  await db.transaction(async (tx) => {
    await withdrawPendingRequests(tx, cardId);
    await tx.delete(card).where(eq(card.id, cardId));
  });
}

/**
 * Removes a card from view but keeps the row, so the contacts collected on it
 * stay with the former holder and the organization. Receipts still waiting
 * for review are rejected, since there is no card left to extend.
 */
export async function removeCard(
  cardId: string,
  holderUserId: string,
  executor: typeof db | Transaction = db
) {
  await executor.transaction(async (tx) => {
    const paymentIds = await withdrawPendingRequests(tx, cardId, holderUserId);
    if (paymentIds.length) {
      await tx
        .update(subscriptionPayment)
        .set({ status: 'rejected', note: 'Card removed by its holder' })
        .where(
          and(
            inArray(subscriptionPayment.id, paymentIds),
            eq(subscriptionPayment.status, 'submitted')
          )
        );
    }
    await tx
      .update(card)
      .set({ removedAt: new Date() })
      .where(and(eq(card.id, cardId), isNull(card.removedAt)));
  });
}
