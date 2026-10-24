import { and, asc, desc, eq, gt, ne, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '~~/server/db';
import {
  onboardingInvitation,
  organization,
  card,
  subscriptionPlan,
  member,
  cardSubscription,
  subscriptionPayment,
  subscriptionPaymentItem,
  session,
} from '~~/server/db/schema';
import { sendEmail } from '~~/server/lib/mailer';
import { env } from '~~/env';
import { slugify } from '~~/shared/utils/slugify';
import { ROUTES } from '~~/shared/utils/routes';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';
import {
  findOnboardingInvitation,
  findOnboardingInvitationWithContext,
  listOnboardingInvitations,
  recordOnboardingInvitationSent,
  type OnboardingInvitationRow,
} from '~~/server/features/onboarding/onboarding-invitation.repository';
import type { Collection } from '~~/shared/contracts/collection';
import type {
  OnboardingInvitationPreview,
  OnboardingInvitationSummary,
} from '~~/shared/contracts/onboarding';

export function addMonths(base: Date, months: number) {
  const result = new Date(base);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function normalizeEmail(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export async function getPendingOnboardingInvitationByEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const now = new Date();
  const [invite] = await db
    .select({ id: onboardingInvitation.id })
    .from(onboardingInvitation)
    .where(
      and(
        sql`lower(${onboardingInvitation.email}) = ${normalized}`,
        eq(onboardingInvitation.status, 'pending'),
        gt(onboardingInvitation.expiresAt, now)
      )
    )
    .orderBy(desc(onboardingInvitation.createdAt))
    .limit(1);

  return invite ?? null;
}

export async function createOnboardingInvitation(params: {
  email: string;
  organizationName: string;
  cardId: string;
  subscriptionPlanCode: string;
  freeMonths: number;
  expirationMinutes: number;
  createdByUserId: string;
}) {
  const now = new Date();
  const normalizedEmail = normalizeEmail(params.email);
  const expiresAt = new Date(
    now.getTime() + params.expirationMinutes * 60 * 1000
  );

  return await db.transaction(async (tx) => {
    const selectedCard = await tx.query.card.findFirst({
      where: eq(card.id, params.cardId),
      columns: {
        id: true,
        userId: true,
      },
    });

    if (!selectedCard) {
      throw notFound("'Card'");
    }
    if (selectedCard.userId) {
      throw conflict('Selected card is already linked to a user');
    }

    const plan = await tx.query.subscriptionPlan.findFirst({
      where: and(
        eq(subscriptionPlan.code, params.subscriptionPlanCode),
        eq(subscriptionPlan.isActive, true)
      ),
      columns: { code: true },
    });
    if (!plan) {
      throw conflict('Selected subscription plan is invalid');
    }

    const pendingForCard = await tx.query.onboardingInvitation.findFirst({
      where: and(
        eq(onboardingInvitation.cardId, params.cardId),
        eq(onboardingInvitation.status, 'pending'),
        gt(onboardingInvitation.expiresAt, now)
      ),
      columns: { id: true },
    });
    if (pendingForCard) {
      throw conflict('Card already has an active onboarding invitation');
    }

    const [createdOrganization] = await tx
      .insert(organization)
      .values({
        id: nanoid(),
        name: params.organizationName,
        slug: `${slugify(params.organizationName)}-space-${nanoid()}`,
        type: ORGANIZATION_TYPES.PERSONAL,
        createdAt: now,
      })
      .returning();
    if (!createdOrganization) {
      throw new Error('Failed to create invitation organization');
    }

    await tx
      .update(card)
      .set({
        organizationId: createdOrganization.id,
        updatedAt: now,
      })
      .where(eq(card.id, params.cardId));

    const [created] = await tx
      .insert(onboardingInvitation)
      .values({
        email: normalizedEmail,
        organizationId: createdOrganization.id,
        cardId: params.cardId,
        subscriptionPlanCode: params.subscriptionPlanCode,
        freeMonths: params.freeMonths,
        expirationMinutes: params.expirationMinutes,
        expiresAt,
        createdByUserId: params.createdByUserId,
        status: 'pending',
      })
      .returning();
    if (!created) {
      throw new Error('Failed to create onboarding invitation');
    }

    return created;
  });
}

export function buildOnboardingInvitationLink(
  invitationId: string,
  email: string
) {
  return `${env.BASE_URL}${ROUTES.INVITE.CARD(invitationId, email)}`;
}

export async function sendOnboardingInvitationEmail(params: {
  invitationId: string;
  email: string;
}) {
  await sendEmail({
    to: [params.email],
    subject: 'Your LA PERSONA card is ready',
    html: await renderEmailComponent('OnboardingInvitation', {
      inviteUrl: buildOnboardingInvitationLink(
        params.invitationId,
        params.email
      ),
    }),
  });
}

export async function acceptOnboardingInvitation(params: {
  invitationId: string;
  userId: string;
  userEmail: string;
  sessionId?: string;
}) {
  const normalizedEmail = normalizeEmail(params.userEmail);
  const now = new Date();

  return await db.transaction(async (tx) => {
    const invite = await tx.query.onboardingInvitation.findFirst({
      where: eq(onboardingInvitation.id, params.invitationId),
    });
    if (!invite) {
      throw notFound("'Invitation'");
    }
    if (invite.status !== 'pending') {
      throw conflict('Invitation has already been processed');
    }
    if (invite.expiresAt <= now) {
      throw conflict('Invitation has expired');
    }
    if (normalizeEmail(invite.email) !== normalizedEmail) {
      throw forbidden('This invitation is for a different email address');
    }

    const thakhinOrganizationId = invite.organizationId;
    const [existingPersonal] = await tx
      .select({ id: organization.id })
      .from(organization)
      .innerJoin(member, eq(member.organizationId, organization.id))
      .where(
        and(
          eq(member.userId, params.userId),
          eq(member.role, 'owner'),
          eq(organization.type, ORGANIZATION_TYPES.PERSONAL),
          ne(organization.id, thakhinOrganizationId),
          ne(organization.id, env.PLACEHOLDER_ORGANIZATION_ID)
        )
      )
      .orderBy(asc(organization.createdAt))
      .limit(1);

    const targetOrganizationId = existingPersonal?.id ?? thakhinOrganizationId;

    if (!existingPersonal) {
      const existingMembership = await tx.query.member.findFirst({
        where: and(
          eq(member.organizationId, thakhinOrganizationId),
          eq(member.userId, params.userId)
        ),
        columns: { id: true },
      });

      if (!existingMembership) {
        await tx.insert(member).values({
          id: nanoid(),
          organizationId: thakhinOrganizationId,
          userId: params.userId,
          role: 'owner',
          createdAt: now,
        });
      }
    }

    const invitedCard = await tx.query.card.findFirst({
      where: eq(card.id, invite.cardId),
      columns: { id: true, organizationId: true },
    });
    if (!invitedCard) {
      throw notFound("'Invited card'");
    }
    if (invitedCard.organizationId !== thakhinOrganizationId) {
      throw conflict('Invited card is not linked to invitation organization');
    }

    await tx
      .update(card)
      .set({
        organizationId: targetOrganizationId,
        userId: params.userId,
        updatedAt: now,
      })
      .where(eq(card.id, invite.cardId));

    const startAt = now;
    const endAt = addMonths(startAt, Math.max(0, invite.freeMonths));

    const [payment] = await tx
      .insert(subscriptionPayment)
      .values({
        organizationId: targetOrganizationId,
        paidByUserId: params.userId,
        receiptUrl: `system:onboarding-invitation:${invite.id}`,
        paymentMethod: 'system',
        status: 'approved',
        note: 'Created from onboarding invitation',
      })
      .returning();
    if (!payment) {
      throw new Error('Failed to create subscription payment');
    }

    const [paymentItem] = await tx
      .insert(subscriptionPaymentItem)
      .values({
        paymentId: payment.id,
        cardId: invite.cardId,
        planCode: invite.subscriptionPlanCode,
        termYears: 1,
        startAt,
        endAt,
        amountMinor: 0,
        currency: 'MMK',
      })
      .returning();
    if (!paymentItem) {
      throw new Error('Failed to create subscription payment item');
    }

    await tx
      .insert(cardSubscription)
      .values({
        cardId: invite.cardId,
        planCode: invite.subscriptionPlanCode,
        status: 'active',
        isTrial: false,
        currentPeriodStartAt: startAt,
        currentPeriodEndAt: endAt,
        lastPaymentItemId: paymentItem.id,
        activatedAt: now,
      })
      .onConflictDoUpdate({
        target: cardSubscription.cardId,
        set: {
          planCode: invite.subscriptionPlanCode,
          status: 'active',
          isTrial: false,
          currentPeriodStartAt: startAt,
          currentPeriodEndAt: endAt,
          lastPaymentItemId: paymentItem.id,
          activatedAt: now,
          expiredAt: null,
          updatedAt: now,
        },
      });

    await tx
      .update(onboardingInvitation)
      .set({
        organizationId: targetOrganizationId,
        status: 'accepted',
        acceptedByUserId: params.userId,
        acceptedAt: now,
        updatedAt: now,
      })
      .where(eq(onboardingInvitation.id, invite.id));

    if (params.sessionId) {
      await tx
        .update(session)
        .set({ activeOrganizationId: targetOrganizationId })
        .where(eq(session.id, params.sessionId));
    }

    if (existingPersonal) {
      await tx
        .delete(organization)
        .where(eq(organization.id, thakhinOrganizationId));
    }

    const targetOrganization = await tx.query.organization.findFirst({
      where: eq(organization.id, targetOrganizationId),
      columns: { slug: true },
    });
    if (!targetOrganization) {
      throw new Error('Failed to finalize invitation acceptance');
    }

    return { organizationSlug: targetOrganization.slug };
  });
}

export async function cancelOnboardingInvitation(invitationId: string) {
  const now = new Date();

  return await db.transaction(async (tx) => {
    const invite = await tx.query.onboardingInvitation.findFirst({
      where: eq(onboardingInvitation.id, invitationId),
    });
    if (!invite) {
      throw notFound("'Invitation'");
    }
    if (invite.status !== 'pending') {
      throw conflict('Only pending invitations can be cancelled.');
    }

    const members = await tx
      .select({ id: member.id })
      .from(member)
      .where(eq(member.organizationId, invite.organizationId));
    const selectedCard = await tx.query.card.findFirst({
      where: eq(card.id, invite.cardId),
      columns: { id: true, userId: true, organizationId: true },
    });
    if (!selectedCard) {
      throw notFound("'Card'");
    }
    if (members.length > 0 || selectedCard.userId) {
      throw conflict(
        'Invitation cannot be cancelled because the organization or card is already in use.'
      );
    }

    if (selectedCard.organizationId === invite.organizationId) {
      await tx
        .update(card)
        .set({
          organizationId: env.PLACEHOLDER_ORGANIZATION_ID,
          updatedAt: now,
        })
        .where(eq(card.id, selectedCard.id));
    }

    await tx
      .update(onboardingInvitation)
      .set({
        status: 'cancelled',
        organizationId: env.PLACEHOLDER_ORGANIZATION_ID,
        updatedAt: now,
      })
      .where(eq(onboardingInvitation.id, invite.id));

    if (invite.organizationId !== env.PLACEHOLDER_ORGANIZATION_ID) {
      await tx
        .delete(organization)
        .where(eq(organization.id, invite.organizationId));
    }

    return {
      id: invite.id,
      email: invite.email,
      cardId: invite.cardId,
      deletedOrganizationId: invite.organizationId,
    };
  });
}

// ── Read models and delivery ────────────────────────────────────────────────

function toInvitationSummary(
  row: OnboardingInvitationRow
): OnboardingInvitationSummary {
  const { invitation } = row;
  return {
    id: invitation.id,
    email: invitation.email,
    status: invitation.status,
    freeMonths: invitation.freeMonths,
    expirationMinutes: invitation.expirationMinutes,
    expiresAt: invitation.expiresAt.toISOString(),
    acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
    resendCount: invitation.resendCount,
    lastSentAt: invitation.lastSentAt?.toISOString() ?? null,
    createdAt: invitation.createdAt.toISOString(),
    organizationId: invitation.organizationId,
    organizationName: row.organizationName,
    organizationSlug: row.organizationSlug,
    cardId: invitation.cardId,
    cardFirstName: row.cardFirstName,
    cardLastName: row.cardLastName,
    planCode: invitation.subscriptionPlanCode,
    planName: row.planName,
    link: buildOnboardingInvitationLink(invitation.id, invitation.email),
  };
}

export async function listInvitationsForAdmin(): Promise<
  Collection<OnboardingInvitationSummary>
> {
  return {
    items: (await listOnboardingInvitations()).map(toInvitationSummary),
  };
}

export async function describeInvitationForAdmin(invitationId: string) {
  const row = await findOnboardingInvitationWithContext(invitationId);
  if (!row) throw notFound('Invitation');
  return toInvitationSummary(row);
}

/** The invitee's view; accepting requires the invited email address. */
export async function previewInvitationForUser(
  invitationId: string,
  viewerEmail: string
): Promise<OnboardingInvitationPreview> {
  const row = await findOnboardingInvitationWithContext(invitationId);
  if (!row) throw notFound('Invitation');
  const { invitation } = row;
  const isExpired = invitation.expiresAt <= new Date();
  const isEmailMatched =
    normalizeEmail(viewerEmail) === normalizeEmail(invitation.email);
  return {
    id: invitation.id,
    email: invitation.email,
    status: invitation.status,
    freeMonths: invitation.freeMonths,
    expiresAt: invitation.expiresAt.toISOString(),
    acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
    organizationName: row.organizationName,
    organizationSlug: row.organizationSlug,
    cardSlug: row.cardSlug,
    cardFirstName: row.cardFirstName,
    cardLastName: row.cardLastName,
    planName: row.planName,
    isExpired,
    isEmailMatched,
    canAccept: invitation.status === 'pending' && !isExpired && isEmailMatched,
  };
}

/** Sends (or re-sends) the invitation email and restarts its expiry window. */
export async function deliverOnboardingInvitation(invitationId: string) {
  const invitation = await findOnboardingInvitation(invitationId);
  if (!invitation) throw notFound('Invitation');
  if (invitation.status !== 'pending') {
    throw conflict(
      'Only pending invitations can be sent.',
      'invitation_decided'
    );
  }

  await sendOnboardingInvitationEmail({
    invitationId,
    email: invitation.email,
  });

  const now = new Date();
  const updated = await recordOnboardingInvitationSent(invitationId, {
    expiresAt: new Date(
      now.getTime() + invitation.expirationMinutes * 60 * 1000
    ),
    lastSentAt: now,
    resendCount: invitation.resendCount + 1,
  });
  if (!updated) throw notFound('Invitation');
  return describeInvitationForAdmin(invitationId);
}
