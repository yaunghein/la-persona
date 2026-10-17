import { and, desc, eq, gt, isNotNull, isNull } from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  card,
  cardSubscription,
  onboardingInvitation,
  organization,
  user,
} from '~~/server/db/schema';

function selectAdminCards() {
  return db
    .select({
      card,
      organizationName: organization.name,
      organizationSlug: organization.slug,
      organizationType: organization.type,
      linkedUserEmail: user.email,
      subscription: {
        status: cardSubscription.status,
        planCode: cardSubscription.planCode,
        isTrial: cardSubscription.isTrial,
        trialEndAt: cardSubscription.trialEndAt,
        currentPeriodEndAt: cardSubscription.currentPeriodEndAt,
      },
    })
    .from(card)
    .innerJoin(organization, eq(organization.id, card.organizationId))
    .leftJoin(user, eq(user.id, card.userId))
    .leftJoin(cardSubscription, eq(cardSubscription.cardId, card.id));
}

export function listAdminCards(filter: { claimed?: boolean }) {
  return selectAdminCards()
    .where(
      filter.claimed === undefined
        ? undefined
        : filter.claimed
          ? isNotNull(card.userId)
          : isNull(card.userId)
    )
    .orderBy(desc(card.updatedAt));
}

export type AdminCardRow = Awaited<ReturnType<typeof listAdminCards>>[number];

export async function findAdminCard(cardId: string) {
  const [row] = await selectAdminCards().where(eq(card.id, cardId)).limit(1);
  return row ?? null;
}

export async function findPendingOnboardingInvitationForCard(cardId: string) {
  const [row] = await db
    .select({
      id: onboardingInvitation.id,
      email: onboardingInvitation.email,
      expiresAt: onboardingInvitation.expiresAt,
    })
    .from(onboardingInvitation)
    .where(
      and(
        eq(onboardingInvitation.cardId, cardId),
        eq(onboardingInvitation.status, 'pending'),
        gt(onboardingInvitation.expiresAt, new Date())
      )
    )
    .limit(1);
  return row ?? null;
}

export async function organizationExists(organizationId: string) {
  const [row] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);
  return !!row;
}

export async function insertAdminCard(values: typeof card.$inferInsert) {
  const [row] = await db.insert(card).values(values).returning();
  return row ?? null;
}
