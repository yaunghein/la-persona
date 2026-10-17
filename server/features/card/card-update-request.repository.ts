import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { card, cardUpdateRequest, user } from '~~/server/db/schema';

export async function listCardUpdateRequestsForReview(filter: {
  status?: string;
  limit: number;
  offset: number;
}) {
  const where = filter.status
    ? eq(cardUpdateRequest.status, filter.status)
    : undefined;
  const [rows, [totals]] = await Promise.all([
    db
      .select({
        request: cardUpdateRequest,
        card: {
          id: card.id,
          slug: card.slug,
          firstName: card.firstName,
          lastName: card.lastName,
          position: card.position,
          phone: card.phone,
          email: card.email,
          website: card.website,
        },
        requesterName: user.name,
        requesterEmail: user.email,
      })
      .from(cardUpdateRequest)
      .innerJoin(card, eq(card.id, cardUpdateRequest.cardId))
      .innerJoin(user, eq(user.id, cardUpdateRequest.requestedBy))
      .where(where)
      .orderBy(desc(cardUpdateRequest.createdAt))
      .limit(filter.limit)
      .offset(filter.offset),
    db.select({ total: count() }).from(cardUpdateRequest).where(where),
  ]);
  return { rows, total: totals?.total ?? 0 };
}

export async function findCardUpdateRequest(requestId: string) {
  const [row] = await db
    .select({ request: cardUpdateRequest, requesterEmail: user.email })
    .from(cardUpdateRequest)
    .innerJoin(user, eq(user.id, cardUpdateRequest.requestedBy))
    .where(eq(cardUpdateRequest.id, requestId))
    .limit(1);
  return row ?? null;
}

/**
 * Decides a pending update request; on approval also writes the requested
 * fields to the card. Returns false if it was already decided.
 */
export function decideCardUpdateRequest(input: {
  requestId: string;
  cardId: string;
  status: 'approved' | 'declined';
  cardChanges: Partial<typeof card.$inferInsert>;
}) {
  const now = new Date();
  return db.transaction(async (tx) => {
    const [decided] = await tx
      .update(cardUpdateRequest)
      .set({ status: input.status, updatedAt: now })
      .where(
        and(
          eq(cardUpdateRequest.id, input.requestId),
          eq(cardUpdateRequest.status, 'pending')
        )
      )
      .returning({ id: cardUpdateRequest.id });
    if (!decided) return false;

    if (input.status === 'approved' && Object.keys(input.cardChanges).length) {
      await tx
        .update(card)
        .set({ ...input.cardChanges, updatedAt: now })
        .where(eq(card.id, input.cardId));
    }
    return true;
  });
}
