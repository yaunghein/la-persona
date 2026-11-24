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
import { cardNeedsSetup } from '~~/shared/utils/card-setup';
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
import type { InvitationInvitee } from '~~/shared/contracts/organization';

export function normalizeEmail(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export async function getPendingOnboardingInvitationByEmail(email: string) {
  return findLatestPendingOnboardingInvitation(email, { openOnly: true });
}

export async function getLatestPendingOnboardingInvitationByEmail(
  email: string
) {
  return findLatestPendingOnboardingInvitation(email, { openOnly: false });
}

async function findLatestPendingOnboardingInvitation(
  email: string,
  options: { openOnly: boolean }
) {
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
        options.openOnly ? gt(onboardingInvitation.expiresAt, now) : undefined
      )
    )
    .orderBy(desc(onboardingInvitation.createdAt))
    .limit(1);

  return invite ?? null;
}

function maskEmail(email: string) {
  const [local = '', domain = ''] = email.split('@');
  const masked =
    local.length <= 2
      ? `${local[0] ?? ''}*`
      : `${local[0]}${'*'.repeat(local.length - 2)}${local.at(-1)}`;
  return `${masked}@${domain}`;
}

export async function createOnboardingInvitation(params: {
  email: string;
  organizationName: string;
  cardId: string;
  subscriptionPlanCode: string;
  amountMinor: number;
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
    // Locked so two overlapping creates for one card can't both pass the pending check.
    const [selectedCard] = await tx
      .select({ id: card.id, userId: card.userId })
      .from(card)
      .where(eq(card.id, params.cardId))
      .for('update');

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
        amountMinor: params.amountMinor,
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

export function buildOnboardingInvitationLink(invitationId: string) {
  return `${env.BASE_URL}${ROUTES.INVITE.CARD(invitationId)}`;
}

export async function sendOnboardingInvitationEmail(params: {
  invitationId: string;
  email: string;
}) {
  await sendEmail({
    to: [params.email],
    subject: 'Your LA PERSONA card is ready',
    html: await renderEmailComponent('OnboardingInvitation', {
      inviteUrl: buildOnboardingInvitationLink(params.invitationId),
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
    // Locked so a second overlapping accept waits, then sees `accepted`.
    const [invite] = await tx
      .select()
      .from(onboardingInvitation)
      .where(eq(onboardingInvitation.id, params.invitationId))
      .for('update');
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

    const invitedCard = await tx.query.card.findFirst({
      where: eq(card.id, invite.cardId),
      columns: {
        id: true,
        organizationId: true,
        userId: true,
        slug: true,
        socials: true,
        website: true,
      },
    });
    if (!invitedCard) {
      throw notFound("'Invited card'");
    }
    if (invitedCard.organizationId !== invite.organizationId) {
      throw conflict('Invited card is not linked to invitation organization');
    }
    if (invitedCard.userId) {
      throw conflict('This card is already linked to an account.');
    }

    const thakhinOrganizationId = invite.organizationId;
    const [existingPersonal] = await tx
      .select({ id: organization.id })
      .from(organization)
      .innerJoin(member, eq(member.organizationId, organization.id))
      .where(
        and(
          eq(member.userId, params.userId),
          eq(member.role, 'admin'),
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
          role: 'admin',
          createdAt: now,
        });
      }
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
    const endAt = new Date(startAt);
    endAt.setMonth(endAt.getMonth() + Math.max(0, invite.freeMonths));

    const plan = await tx.query.subscriptionPlan.findFirst({
      where: eq(subscriptionPlan.code, invite.subscriptionPlanCode),
      columns: { currency: true },
    });
    if (!plan) throw conflict('Selected subscription plan is invalid');

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
        startAt,
        endAt,
        amountMinor: invite.amountMinor,
        currency: plan.currency,
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

    return {
      organizationSlug: targetOrganization.slug,
      cardSlug: invitedCard.slug,
      needsSetup: cardNeedsSetup(invitedCard),
    };
  });
}

export async function cancelOnboardingInvitation(invitationId: string) {
  const now = new Date();

  return await db.transaction(async (tx) => {
    const [invite] = await tx
      .select()
      .from(onboardingInvitation)
      .where(eq(onboardingInvitation.id, invitationId))
      .for('update');
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
    amountMinor: invitation.amountMinor,
    currency: row.currency,
    link: buildOnboardingInvitationLink(invitation.id),
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
  if (normalizeEmail(viewerEmail) !== normalizeEmail(invitation.email)) {
    throw forbidden(
      `This invitation was sent to ${maskEmail(invitation.email)}.`,
      'not_invitee'
    );
  }
  const isExpired = invitation.expiresAt <= new Date();
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
    isEmailMatched: true,
    canAccept: invitation.status === 'pending' && !isExpired,
  };
}

export async function describeOnboardingInvitee(
  invitationId: string
): Promise<InvitationInvitee> {
  const invitation = await findOnboardingInvitation(invitationId);
  if (
    !invitation ||
    invitation.status !== 'pending' ||
    invitation.expiresAt <= new Date()
  ) {
    throw notFound('Invitation');
  }
  return { email: invitation.email };
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

  // Expiry and resend count only move once the email is out, so a failed
  // send leaves the invite as it was for Thakhin to resend.
  await sendOnboardingInvitationEmail({
    invitationId,
    email: invitation.email,
  }).catch(() => {
    throw upstreamFailed('The invitation email could not be sent.');
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
