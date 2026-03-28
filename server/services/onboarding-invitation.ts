import { and, eq, gt } from 'drizzle-orm';
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
import { sendEmail } from '~~/server/utils/email';
import { env } from '~~/server/utils/env';
import { slugify } from '~~/shared/utils/slugify';

export function addMonths(base: Date, months: number) {
  const result = new Date(base);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function normalizeEmail(value: string) {
  return String(value || '').trim().toLowerCase();
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
  const expiresAt = new Date(now.getTime() + params.expirationMinutes * 60 * 1000);

  return await db.transaction(async (tx) => {
    const selectedCard = await tx.query.card.findFirst({
      where: eq(card.id, params.cardId),
      columns: {
        id: true,
        userId: true,
      },
    });

    if (!selectedCard) {
      throw createError({ statusCode: 404, statusMessage: 'Card not found' });
    }
    if (selectedCard.userId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Selected card is already linked to a user',
      });
    }

    const plan = await tx.query.subscriptionPlan.findFirst({
      where: and(
        eq(subscriptionPlan.code, params.subscriptionPlanCode),
        eq(subscriptionPlan.isActive, true)
      ),
      columns: { code: true },
    });
    if (!plan) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Selected subscription plan is invalid',
      });
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
      throw createError({
        statusCode: 400,
        statusMessage: 'Card already has an active onboarding invitation',
      });
    }

    const [createdOrganization] = await tx
      .insert(organization)
      .values({
        id: nanoid(),
        name: params.organizationName,
        slug: `${slugify(params.organizationName)}-space-${nanoid()}`,
        isPersonal: false,
        createdAt: now,
      })
      .returning();
    if (!createdOrganization) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create invitation organization',
      });
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
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create onboarding invitation',
      });
    }

    return created;
  });
}

export function buildOnboardingInvitationLink(invitationId: string) {
  return `${env.BASE_URL}/platform/invitations/${invitationId}`;
}

export async function sendOnboardingInvitationEmail(params: {
  invitationId: string;
  email: string;
}) {
  const link = buildOnboardingInvitationLink(params.invitationId);
  await sendEmail({
    to: [params.email],
    subject: 'You are invited to LA PERSONA',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111111;">
        <h2 style="margin: 0 0 12px;">You are invited</h2>
        <p style="margin: 0 0 16px;">
          Click the button below to accept your invitation and continue onboarding.
        </p>
        <a
          href="${link}"
          style="
            display: inline-block;
            padding: 10px 18px;
            border-radius: 9999px;
            background: #111111;
            color: #ffffff;
            text-decoration: none;
            font-weight: 600;
          "
        >
          Accept Invitation
        </a>
        <p style="margin: 16px 0 0; font-size: 12px; color: #6b7280;">
          If the button does not work, paste this URL in your browser:
        </p>
        <p style="margin: 8px 0 0; font-size: 12px; word-break: break-all; color: #6b7280;">
          ${link}
        </p>
      </div>
    `,
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
      throw createError({ statusCode: 404, statusMessage: 'Invitation not found' });
    }
    if (invite.status !== 'pending') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invitation has already been processed',
      });
    }
    if (invite.expiresAt <= now) {
      throw createError({ statusCode: 400, statusMessage: 'Invitation has expired' });
    }
    if (normalizeEmail(invite.email) !== normalizedEmail) {
      throw createError({
        statusCode: 403,
        statusMessage: 'This invitation is for a different email address',
      });
    }

    const existingMembership = await tx.query.member.findFirst({
      where: and(
        eq(member.organizationId, invite.organizationId),
        eq(member.userId, params.userId)
      ),
      columns: { id: true },
    });

    if (!existingMembership) {
      await tx.insert(member).values({
        id: nanoid(),
        organizationId: invite.organizationId,
        userId: params.userId,
        role: 'owner',
        createdAt: now,
      });
    }

    const invitedCard = await tx.query.card.findFirst({
      where: eq(card.id, invite.cardId),
      columns: { id: true, organizationId: true },
    });
    if (!invitedCard) {
      throw createError({ statusCode: 404, statusMessage: 'Invited card not found' });
    }
    if (invitedCard.organizationId !== invite.organizationId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invited card is not linked to invitation organization',
      });
    }

    await tx
      .update(card)
      .set({
        userId: params.userId,
        updatedAt: now,
      })
      .where(eq(card.id, invite.cardId));

    const startAt = now;
    const endAt = addMonths(startAt, Math.max(0, invite.freeMonths));

    const [payment] = await tx
      .insert(subscriptionPayment)
      .values({
        organizationId: invite.organizationId,
        paidByUserId: params.userId,
        receiptUrl: `system:onboarding-invitation:${invite.id}`,
        paymentMethod: 'system',
        status: 'approved',
        note: 'Created from onboarding invitation',
      })
      .returning();
    if (!payment) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create subscription payment',
      });
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
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create subscription payment item',
      });
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
        status: 'accepted',
        acceptedByUserId: params.userId,
        acceptedAt: now,
        updatedAt: now,
      })
      .where(eq(onboardingInvitation.id, invite.id));

    if (params.sessionId) {
      await tx
        .update(session)
        .set({ activeOrganizationId: invite.organizationId })
        .where(eq(session.id, params.sessionId));
    }

    const accepted = await tx.query.onboardingInvitation.findFirst({
      where: eq(onboardingInvitation.id, invite.id),
    });
    if (!accepted) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to finalize invitation acceptance',
      });
    }

    return accepted;
  });
}
