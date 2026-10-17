import { desc, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  card,
  onboardingInvitation,
  organization,
  subscriptionPlan,
} from '~~/server/db/schema';

function selectInvitations() {
  return db
    .select({
      invitation: onboardingInvitation,
      organizationName: organization.name,
      organizationSlug: organization.slug,
      cardSlug: card.slug,
      cardFirstName: card.firstName,
      cardLastName: card.lastName,
      planName: subscriptionPlan.name,
    })
    .from(onboardingInvitation)
    .innerJoin(organization, eq(organization.id, onboardingInvitation.organizationId))
    .innerJoin(card, eq(card.id, onboardingInvitation.cardId))
    .innerJoin(
      subscriptionPlan,
      eq(subscriptionPlan.code, onboardingInvitation.subscriptionPlanCode)
    );
}

export function listOnboardingInvitations() {
  return selectInvitations().orderBy(desc(onboardingInvitation.createdAt));
}

export type OnboardingInvitationRow = Awaited<
  ReturnType<typeof listOnboardingInvitations>
>[number];

export async function findOnboardingInvitationWithContext(invitationId: string) {
  const [row] = await selectInvitations()
    .where(eq(onboardingInvitation.id, invitationId))
    .limit(1);
  return row ?? null;
}

export async function findOnboardingInvitation(invitationId: string) {
  const [row] = await db
    .select()
    .from(onboardingInvitation)
    .where(eq(onboardingInvitation.id, invitationId))
    .limit(1);
  return row ?? null;
}

export async function recordOnboardingInvitationSent(
  invitationId: string,
  values: { expiresAt: Date; lastSentAt: Date; resendCount: number }
) {
  const [row] = await db
    .update(onboardingInvitation)
    .set({ ...values, updatedAt: values.lastSentAt })
    .where(eq(onboardingInvitation.id, invitationId))
    .returning();
  return row ?? null;
}
