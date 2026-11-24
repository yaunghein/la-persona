import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  ne,
  or,
  sql,
} from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { env } from '~~/env';
import { db } from '~~/server/db';
import {
  analytics,
  card,
  cardAssignment,
  cardSubscription,
  companySetting,
  contactExchange,
  department,
  invitation,
  member,
  organization,
  retiredCardSlug,
  subscriptionPayment,
  subscriptionPaymentItem,
  subscriptionPlan,
  user,
} from '~~/server/db/schema';
import type { Transaction } from '~~/server/features/billing/billing.repository';
import { sendEmail } from '~~/server/lib/mailer';
import type { EmailSendResult } from '~~/server/utils/wide-event';
import type {
  AssignCompanyCardRequest,
  CreateCompanyCardsRequest,
  RecordCompanyPaymentRequest,
  UpdateCompanySettingsRequest,
} from '~~/shared/contracts/company';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';
import { ROUTES } from '~~/shared/utils/routes';
import { viewerRecentDays } from '~~/shared/utils/datetime';
import { slugify } from '~~/shared/utils/slugify';
import { viewerDaySql } from '~~/server/utils/request-timezone';
import { effectiveSubscriptionStatus } from '~~/shared/utils/subscription';

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const INVITE_DAYS = 14;

function addYears(base: Date, years: number) {
  const result = new Date(base);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

function addMonth(base: Date) {
  return new Date(base.getTime() + MONTH_MS);
}

function parseEnd(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw badRequest('Enter a valid end date.');
  return date;
}

function shareAmounts(total: number, count: number) {
  const base = Math.floor(total / count);
  const amounts = Array.from({ length: count }, () => base);
  amounts[count - 1] = total - base * (count - 1);
  return amounts;
}

async function companyOrThrow(organizationId: string) {
  const [row] = await db
    .select()
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);
  if (!row) throw notFound('Organization');
  if (row.type !== ORGANIZATION_TYPES.COMPANY) {
    throw conflict('This organization is not a company.', 'not_company');
  }
  return row;
}

export async function findCompanySetting(organizationId: string) {
  const [row] = await db
    .select()
    .from(companySetting)
    .where(eq(companySetting.organizationId, organizationId))
    .limit(1);
  return row ?? null;
}

export async function ensureCompanySetting(organizationId: string) {
  const existing = await findCompanySetting(organizationId);
  if (existing) return existing;
  // A concurrent first call may insert the row between the select and here.
  await db
    .insert(companySetting)
    .values({ organizationId })
    .onConflictDoNothing({ target: companySetting.organizationId });
  const [created] = await db
    .select()
    .from(companySetting)
    .where(eq(companySetting.organizationId, organizationId))
    .limit(1);
  if (!created) throw new Error('Company setting insert returned no row.');
  return created;
}

async function currentAdminUserId(organizationId: string) {
  const [row] = await db
    .select({ userId: member.userId })
    .from(member)
    .where(
      and(eq(member.organizationId, organizationId), eq(member.role, 'admin'))
    )
    .orderBy(asc(member.createdAt))
    .limit(1);
  return row?.userId ?? null;
}

async function standardPlan() {
  const [plan] = await db
    .select()
    .from(subscriptionPlan)
    .where(eq(subscriptionPlan.code, 'standard'))
    .limit(1);
  if (!plan) throw conflict('The standard plan is not configured.');
  return plan;
}

async function slugIsTaken(slug: string) {
  const [cardRow] = await db
    .select({ id: card.id })
    .from(card)
    .where(eq(card.slug, slug))
    .limit(1);
  if (cardRow) return true;
  const [retired] = await db
    .select({ slug: retiredCardSlug.slug })
    .from(retiredCardSlug)
    .where(eq(retiredCardSlug.slug, slug))
    .limit(1);
  return Boolean(retired);
}

async function freshSlug(name: string) {
  const base = slugify(name) || 'card';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = `${base}-${nanoid(6).toLowerCase()}`;
    if (!(await slugIsTaken(slug))) return slug;
  }
  throw conflict('Could not create a card link. Try again.');
}

export async function openAssignmentId(cardId: string) {
  const [row] = await db
    .select({ id: cardAssignment.id })
    .from(cardAssignment)
    .where(
      and(eq(cardAssignment.cardId, cardId), isNull(cardAssignment.endedAt))
    )
    .limit(1);
  return row?.id ?? null;
}

/**
 * Whether someone held the card's current link and has left. Links only change
 * on reassignment, and a held link is retired then, so a holder who started
 * after the card's latest retirement held the current one.
 */
export async function isCurrentLinkVacated(cardId: string) {
  const [latest] = await db
    .select({
      at: sql<Date | null>`max(${retiredCardSlug.retiredAt})`.mapWith(
        retiredCardSlug.retiredAt
      ),
    })
    .from(retiredCardSlug)
    .where(eq(retiredCardSlug.cardId, cardId));
  const [row] = await db
    .select({ id: cardAssignment.id })
    .from(cardAssignment)
    .where(
      and(
        eq(cardAssignment.cardId, cardId),
        isNotNull(cardAssignment.endedAt),
        latest?.at ? gte(cardAssignment.startedAt, latest.at) : undefined
      )
    )
    .limit(1);
  return Boolean(row);
}

/** One company card per person: no membership and no pending invite on another card. */
async function assertEmailsFreeInCompany(
  organizationId: string,
  emails: string[],
  exceptCardId?: string
) {
  const [taken] = await db
    .select({ email: user.email })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(
      and(
        eq(member.organizationId, organizationId),
        inArray(sql`lower(${user.email})`, emails)
      )
    )
    .limit(1);
  if (taken) {
    throw conflict(
      `${taken.email} is already in this company.`,
      'company_member_exists'
    );
  }
  const [invited] = await db
    .select({ email: invitation.email })
    .from(invitation)
    .where(
      and(
        eq(invitation.organizationId, organizationId),
        eq(invitation.status, 'pending'),
        inArray(sql`lower(${invitation.email})`, emails),
        exceptCardId ? ne(invitation.cardId, exceptCardId) : undefined
      )
    )
    .limit(1);
  if (invited) {
    throw conflict(
      `${invited.email} already has a pending invite to another card.`,
      'company_invite_exists'
    );
  }
}

/** A company invite claims its card only while the card is vacant and the person holds no other card there. */
export async function assertCompanyCardClaimable(
  params: { cardId: string; organizationId: string; userId: string },
  executor: typeof db | Transaction = db
) {
  const [target] = await executor
    .select()
    .from(card)
    .where(
      and(
        eq(card.id, params.cardId),
        eq(card.organizationId, params.organizationId)
      )
    )
    .limit(1);
  if (!target) throw notFound('Card');
  if (target.userId) {
    throw conflict('This card already has a holder.', 'card_claimed');
  }
  const [held] = await executor
    .select({ id: cardAssignment.id })
    .from(cardAssignment)
    .innerJoin(card, eq(card.id, cardAssignment.cardId))
    .where(
      and(
        eq(cardAssignment.userId, params.userId),
        eq(card.organizationId, params.organizationId),
        isNull(cardAssignment.endedAt)
      )
    )
    .limit(1);
  if (held) {
    throw conflict(
      'You already hold a card in this company.',
      'company_card_held'
    );
  }
  return target;
}

/** The holder's own details; company fields and the card's identity stay. */
const CLEARED_HOLDER_FIELDS = {
  userId: null,
  phone: null,
  phoneCountryCode: null,
  avatarUrl: null,
  socials: [],
};

/**
 * Ends the user's company tenures: closes the open assignments, clears the
 * holder's details off the cards, and retires pending invites to them.
 */
export async function vacateCompanyCards(
  params: { userId: string; organizationId?: string; actorUserId: string },
  outer?: Transaction
) {
  if (!outer) {
    await db.transaction((tx) => vacateCompanyCards(params, tx));
    return;
  }
  const tx = outer;
  const held = await tx
    .select({ id: card.id })
    .from(card)
    .innerJoin(organization, eq(organization.id, card.organizationId))
    .where(
      and(
        eq(card.userId, params.userId),
        eq(organization.type, ORGANIZATION_TYPES.COMPANY),
        params.organizationId
          ? eq(card.organizationId, params.organizationId)
          : undefined
      )
    );
  const cardIds = held.map((row) => row.id);
  if (!cardIds.length) return;
  const now = new Date();
  await tx
    .update(cardAssignment)
    .set({ endedAt: now, endedByUserId: params.actorUserId })
    .where(
      and(
        inArray(cardAssignment.cardId, cardIds),
        isNull(cardAssignment.endedAt)
      )
    );
  await tx
    .update(card)
    .set({ ...CLEARED_HOLDER_FIELDS, updatedAt: now })
    .where(inArray(card.id, cardIds));
  await tx
    .update(invitation)
    .set({ status: 'canceled' })
    .where(
      and(inArray(invitation.cardId, cardIds), eq(invitation.status, 'pending'))
    );
}

async function sendCompanyInvite(params: {
  invitationId: string;
  email: string;
  organizationName: string;
  role: string;
}): Promise<EmailSendResult> {
  const inviteUrl = `${env.BASE_URL}${ROUTES.INVITE.COMMUNITY_ACCEPT(params.invitationId)}`;
  const to = [params.email];
  const template =
    params.role === 'admin' ? 'company_admin_invitation' : 'company_invitation';
  try {
    const html = await renderEmailComponent(
      params.role === 'admin'
        ? 'CommunityOrganizerInvitation'
        : 'CommunityInvitation',
      params.role === 'admin'
        ? { organizationName: params.organizationName, inviteUrl }
        : {
            inviterName: params.organizationName,
            organizationName: params.organizationName,
            inviteUrl,
          }
    );
    await sendEmail({
      to,
      subject:
        params.role === 'admin'
          ? `You're invited to administer ${params.organizationName} on LA PERSONA`
          : `You're invited to join ${params.organizationName} on LA PERSONA`,
      html,
    });
    return { ok: true, template, to };
  } catch (error) {
    return {
      ok: false,
      template,
      to,
      error: error instanceof Error ? error.message : 'email_failed',
    };
  }
}

export async function createCompanyCards(params: {
  organizationId: string;
  inviterId: string;
  request: CreateCompanyCardsRequest;
}) {
  const company = await companyOrThrow(params.organizationId);
  const invitedEmails = params.request.cards.map((item) => item.email);
  if (new Set(invitedEmails).size !== invitedEmails.length) {
    throw badRequest('Each card needs a different email.');
  }
  await assertEmailsFreeInCompany(company.id, invitedEmails);
  const setting = await ensureCompanySetting(company.id);
  const plan = await standardPlan();
  const now = new Date();
  const paidCards = params.request.cards.filter((item) => item.paid);
  const freeCards = params.request.cards.filter((item) => item.freeMonth);
  const payerId = await currentAdminUserId(company.id);
  const amount =
    params.request.amountMinor ??
    plan.priceMinor * params.request.termYears * paidCards.length;
  const shares = shareAmounts(amount, Math.max(paidCards.length, 1));

  const created = await db.transaction(async (tx) => {
    const cards: {
      id: string;
      email: string;
      role: string;
      invitationId: string;
    }[] = [];
    let paidIndex = 0;
    const freeItems: {
      cardId: string;
      startAt: Date;
      endAt: Date;
    }[] = [];
    const paidItems: {
      cardId: string;
      startAt: Date;
      endAt: Date;
      amountMinor: number;
    }[] = [];

    for (const draft of params.request.cards) {
      const id = nanoid();
      const slug = await freshSlug(
        `${draft.firstName} ${draft.lastName ?? ''}`
      );
      const freeEnd = addMonth(now);
      const paidStart = draft.freeMonth ? freeEnd : now;
      const paidEnd = addYears(paidStart, params.request.termYears);
      await tx.insert(card).values({
        id,
        firstName: draft.firstName,
        lastName: draft.lastName || null,
        slug,
        position: draft.position,
        email: draft.email,
        company: company.name,
        website: setting.website || null,
        splineUrl: setting.splineUrl || env.DEFAULT_SPLINE_URL,
        wallpaperUrl: setting.wallpaperUrl || env.DEFAULT_WALLPAPER_URL,
        cardBackUrl: setting.cardBackUrl || env.DEFAULT_CARD_BACK_URL,
        organizationId: company.id,
        userId: null,
      });
      const periodEnd = draft.paid ? paidEnd : freeEnd;
      const [subscription] = await tx
        .insert(cardSubscription)
        .values({
          cardId: id,
          planCode: 'standard',
          status: 'active',
          isTrial: false,
          currentPeriodStartAt: now,
          currentPeriodEndAt: periodEnd,
          activatedAt: now,
        })
        .returning({ id: cardSubscription.id });
      if (!subscription)
        throw new Error('Subscription insert returned no row.');
      if (draft.freeMonth) {
        freeItems.push({ cardId: id, startAt: now, endAt: freeEnd });
      }
      if (draft.paid) {
        paidItems.push({
          cardId: id,
          startAt: paidStart,
          endAt: paidEnd,
          amountMinor: shares[paidIndex] ?? 0,
        });
        paidIndex += 1;
      }
      const invitationId = nanoid();
      await tx.insert(invitation).values({
        id: invitationId,
        organizationId: company.id,
        email: draft.email,
        role: draft.role,
        status: 'pending',
        expiresAt: new Date(now.getTime() + INVITE_DAYS * 24 * 60 * 60 * 1000),
        inviterId: params.inviterId,
        cardId: id,
      });
      cards.push({
        id,
        email: draft.email,
        role: draft.role,
        invitationId,
      });
    }

    async function writePayment(
      method: 'system' | 'manual',
      items: {
        cardId: string;
        startAt: Date;
        endAt: Date;
        amountMinor: number;
      }[]
    ) {
      if (!items.length) return new Map<string, string>();
      const [payment] = await tx
        .insert(subscriptionPayment)
        .values({
          organizationId: company.id,
          paidByUserId: payerId,
          paymentMethod: method,
          status: 'approved',
          receiptUrl: null,
          paymentReference:
            method === 'manual' ? params.request.paymentReference : null,
          note: method === 'manual' ? params.request.note : 'Free month',
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: subscriptionPayment.id });
      if (!payment) throw new Error('Payment insert returned no row.');
      const ids = new Map<string, string>();
      for (const item of items) {
        const [row] = await tx
          .insert(subscriptionPaymentItem)
          .values({
            paymentId: payment.id,
            cardId: item.cardId,
            planCode: 'standard',
            startAt: item.startAt,
            endAt: item.endAt,
            amountMinor: item.amountMinor,
            currency: plan.currency,
            createdAt: now,
            updatedAt: now,
          })
          .returning({ id: subscriptionPaymentItem.id });
        if (!row) throw new Error('Payment item insert returned no row.');
        ids.set(item.cardId, row.id);
      }
      return ids;
    }

    const freeIds = await writePayment(
      'system',
      freeItems.map((item) => ({ ...item, amountMinor: 0 }))
    );
    const paidIds = await writePayment('manual', paidItems);
    for (const [index, draft] of params.request.cards.entries()) {
      const cardId = cards[index]?.id;
      if (!cardId) continue;
      const latest =
        (draft.paid ? paidIds.get(cardId) : freeIds.get(cardId)) ?? null;
      if (!latest) continue;
      await tx
        .update(cardSubscription)
        .set({ lastPaymentItemId: latest, updatedAt: now })
        .where(eq(cardSubscription.cardId, cardId));
    }
    return cards;
  });

  const emails = await Promise.all(
    created.map((item) =>
      sendCompanyInvite({
        invitationId: item.invitationId,
        email: item.email,
        organizationName: company.name,
        role: item.role,
      })
    )
  );
  return { cards: created, emails };
}

export async function recordCompanyPayment(params: {
  organizationId: string;
  request: RecordCompanyPaymentRequest;
}) {
  const company = await companyOrThrow(params.organizationId);
  const plan = await standardPlan();
  const now = new Date();
  const enteredEnd = parseEnd(params.request.endAt);
  const payerId = await currentAdminUserId(company.id);
  const uniqueIds = [...new Set(params.request.cardIds)];
  const rows = await db
    .select({
      id: card.id,
      endAt: cardSubscription.currentPeriodEndAt,
      status: cardSubscription.status,
    })
    .from(card)
    .leftJoin(cardSubscription, eq(cardSubscription.cardId, card.id))
    .where(
      and(eq(card.organizationId, company.id), inArray(card.id, uniqueIds))
    );
  if (rows.length !== uniqueIds.length) throw notFound('Card');
  const shares = shareAmounts(params.request.amountMinor, rows.length);

  return db.transaction(async (tx) => {
    const [payment] = await tx
      .insert(subscriptionPayment)
      .values({
        organizationId: company.id,
        paidByUserId: payerId,
        paymentMethod: 'manual',
        status: 'approved',
        paymentReference: params.request.paymentReference,
        note: params.request.note,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: subscriptionPayment.id });
    if (!payment) throw new Error('Payment insert returned no row.');

    for (const [index, row] of rows.entries()) {
      const expired =
        !row.endAt ||
        row.status === 'expired' ||
        row.endAt.getTime() <= now.getTime();
      const startAt = !row.endAt || row.endAt <= now ? now : row.endAt;
      const endAt =
        enteredEnd ?? addYears(startAt, params.request.termYears ?? 1);
      if (endAt <= startAt) {
        throw badRequest('The end date must be after the paid term starts.');
      }
      const [item] = await tx
        .insert(subscriptionPaymentItem)
        .values({
          paymentId: payment.id,
          cardId: row.id,
          planCode: 'standard',
          startAt,
          endAt,
          amountMinor: shares[index] ?? 0,
          currency: plan.currency,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: subscriptionPaymentItem.id });
      if (!item) throw new Error('Payment item insert returned no row.');
      await tx
        .insert(cardSubscription)
        .values({
          cardId: row.id,
          planCode: 'standard',
          status: 'active',
          isTrial: false,
          currentPeriodStartAt: expired ? startAt : now,
          currentPeriodEndAt: endAt,
          lastPaymentItemId: item.id,
          activatedAt: now,
          expiredAt: null,
        })
        .onConflictDoUpdate({
          target: cardSubscription.cardId,
          set: {
            planCode: 'standard',
            status: 'active',
            isTrial: false,
            currentPeriodEndAt: endAt,
            lastPaymentItemId: item.id,
            expiredAt: null,
            ...(expired ? { currentPeriodStartAt: startAt } : {}),
            updatedAt: now,
          },
        });
    }
    return {
      paymentId: payment.id,
      cardIds: uniqueIds,
      amountMinor: params.request.amountMinor,
    };
  });
}

/** Runs after better-auth accepted the invite and added the member. */
export async function claimCompanyInvitation(params: {
  invitationId: string;
  userId: string;
  userEmail: string;
}) {
  const now = new Date();
  return db.transaction(async (tx) => {
    const [invite] = await tx
      .select()
      .from(invitation)
      .where(eq(invitation.id, params.invitationId))
      .limit(1);
    if (
      !invite?.cardId ||
      invite.status !== 'accepted' ||
      invite.email.toLowerCase() !== params.userEmail.toLowerCase()
    ) {
      throw notFound('Invitation');
    }
    const target = await assertCompanyCardClaimable(
      {
        cardId: invite.cardId,
        organizationId: invite.organizationId,
        userId: params.userId,
      },
      tx
    );
    const [account] = await tx
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, params.userId))
      .limit(1);
    await tx
      .update(card)
      .set({ userId: params.userId, updatedAt: now })
      .where(eq(card.id, target.id));
    await tx.insert(cardAssignment).values({
      cardId: target.id,
      userId: params.userId,
      holderName: account?.name || target.firstName,
      holderEmail: invite.email,
      startedAt: now,
    });
    if (invite.role === 'admin') {
      await tx
        .update(subscriptionPayment)
        .set({ paidByUserId: params.userId, updatedAt: now })
        .where(
          and(
            eq(subscriptionPayment.organizationId, invite.organizationId),
            isNull(subscriptionPayment.paidByUserId)
          )
        );
    }
    return { cardSlug: target.slug, organizationId: invite.organizationId };
  });
}

export async function findHeldCompanyCardSlug(cardId: string, userId: string) {
  const [row] = await db
    .select({ slug: card.slug })
    .from(card)
    .where(and(eq(card.id, cardId), eq(card.userId, userId)))
    .limit(1);
  return row?.slug ?? null;
}

/** Undoes better-auth's accept when the card claim fails, so the invite can be retried. */
export async function revertCompanyInviteAcceptance(params: {
  invitationId: string;
  userId: string;
  organizationId: string;
}) {
  await db.transaction(async (tx) => {
    await tx
      .delete(member)
      .where(
        and(
          eq(member.userId, params.userId),
          eq(member.organizationId, params.organizationId)
        )
      );
    await tx
      .update(invitation)
      .set({ status: 'pending' })
      .where(
        and(
          eq(invitation.id, params.invitationId),
          eq(invitation.status, 'accepted')
        )
      );
  });
}

export async function offboardCompanyMember(params: {
  memberId: string;
  organizationId: string;
  actorUserId: string;
}) {
  const [target] = await db
    .select()
    .from(member)
    .where(
      and(
        eq(member.id, params.memberId),
        eq(member.organizationId, params.organizationId)
      )
    )
    .limit(1);
  if (!target) throw notFound('Member');
  await db.transaction(async (tx) => {
    await vacateCompanyCards(
      {
        userId: target.userId,
        organizationId: params.organizationId,
        actorUserId: params.actorUserId,
      },
      tx
    );
    await tx.delete(member).where(eq(member.id, target.id));
  });
}

export async function assignVacantCompanyCard(params: {
  cardId: string;
  organizationId: string;
  inviterId: string;
  organizationName: string;
  request: AssignCompanyCardRequest;
}) {
  const [target] = await db
    .select()
    .from(card)
    .where(
      and(
        eq(card.id, params.cardId),
        eq(card.organizationId, params.organizationId)
      )
    )
    .limit(1);
  if (!target) throw notFound('Card');
  if (target.userId)
    throw conflict('This card already has a holder.', 'card_claimed');
  const departmentId = params.request.departmentId ?? null;
  if (departmentId) {
    const [owned] = await db
      .select({ id: department.id })
      .from(department)
      .where(
        and(
          eq(department.id, departmentId),
          eq(department.organizationId, params.organizationId)
        )
      )
      .limit(1);
    if (!owned) throw badRequest('Choose a department from this company.');
  }
  await assertEmailsFreeInCompany(
    params.organizationId,
    [params.request.email],
    target.id
  );
  const now = new Date();
  const slug = await freshSlug(
    `${params.request.firstName} ${params.request.lastName ?? ''}`
  );
  const invitationId = nanoid();
  // Only a link someone actually held says they left; an unclaimed one just goes away.
  const wasHeld = await isCurrentLinkVacated(target.id);
  await db.transaction(async (tx) => {
    if (wasHeld) {
      await tx.insert(retiredCardSlug).values({
        slug: target.slug,
        cardId: target.id,
        retiredAt: now,
      });
    }
    // The retired link must not let an earlier invitee claim the card.
    await tx
      .update(invitation)
      .set({ status: 'canceled' })
      .where(
        and(eq(invitation.cardId, target.id), eq(invitation.status, 'pending'))
      );
    await tx
      .update(card)
      .set({
        ...CLEARED_HOLDER_FIELDS,
        slug,
        firstName: params.request.firstName,
        lastName: params.request.lastName || null,
        email: params.request.email,
        position: params.request.position,
        departmentId,
        updatedAt: now,
      })
      .where(eq(card.id, target.id));
    await tx.insert(invitation).values({
      id: invitationId,
      organizationId: params.organizationId,
      email: params.request.email,
      role: 'member',
      status: 'pending',
      expiresAt: new Date(now.getTime() + INVITE_DAYS * 24 * 60 * 60 * 1000),
      inviterId: params.inviterId,
      cardId: target.id,
    });
  });
  const email = await sendCompanyInvite({
    invitationId,
    email: params.request.email,
    organizationName: params.organizationName,
    role: 'member',
  });
  return { invitationId, slug, email };
}

export async function resendCompanyCardInvite(cardId: string) {
  const [company] = await db
    .select({ name: organization.name, holderId: card.userId })
    .from(card)
    .innerJoin(organization, eq(organization.id, card.organizationId))
    .where(eq(card.id, cardId))
    .limit(1);
  if (!company) throw notFound('Card');
  if (company.holderId) {
    throw conflict('This card already has a holder.', 'card_claimed');
  }
  const [pending] = await db
    .select()
    .from(invitation)
    .where(and(eq(invitation.cardId, cardId), eq(invitation.status, 'pending')))
    .orderBy(desc(invitation.createdAt))
    .limit(1);
  if (!pending?.email)
    throw conflict('There is no pending invite.', 'no_invite');
  await db
    .update(invitation)
    .set({
      expiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000),
    })
    .where(eq(invitation.id, pending.id));
  const email = await sendCompanyInvite({
    invitationId: pending.id,
    email: pending.email,
    organizationName: company.name,
    role: pending.role ?? 'member',
  });
  return { invitationId: pending.id, email };
}

export async function describeCompanySettings(organizationId: string) {
  const company = await companyOrThrow(organizationId);
  const setting = await findCompanySetting(company.id);
  const departments = await listDepartments(company.id);
  return {
    name: company.name,
    website: setting?.website ?? '',
    logoUrl: company.logo,
    coverImageUrl: setting?.coverUrl ?? null,
    departments: departments.items,
  };
}

export async function listCompanyCards(organizationId: string) {
  const rows = await db
    .select({
      card,
      departmentName: department.name,
      subscriptionStatus: cardSubscription.status,
      periodEnd: cardSubscription.currentPeriodEndAt,
      holderName: user.name,
      memberId: member.id,
      inviteId: invitation.id,
      inviteStatus: invitation.status,
      inviteEmail: invitation.email,
    })
    .from(card)
    .leftJoin(department, eq(department.id, card.departmentId))
    .leftJoin(cardSubscription, eq(cardSubscription.cardId, card.id))
    .leftJoin(user, eq(user.id, card.userId))
    .leftJoin(
      member,
      and(
        eq(member.userId, card.userId),
        eq(member.organizationId, card.organizationId)
      )
    )
    .leftJoin(
      invitation,
      and(eq(invitation.cardId, card.id), eq(invitation.status, 'pending'))
    )
    .where(eq(card.organizationId, organizationId))
    .orderBy(desc(card.createdAt));

  const cardIds = rows.map((row) => row.card.id);
  const counts = cardIds.length
    ? await db
        .select({
          cardId: contactExchange.cardId,
          value: sql<number>`count(*)::int`,
        })
        .from(contactExchange)
        .where(inArray(contactExchange.cardId, cardIds))
        .groupBy(contactExchange.cardId)
    : [];
  const countByCard = new Map(
    counts.flatMap((row) =>
      row.cardId ? [[row.cardId, row.value] as const] : []
    )
  );

  return {
    items: rows.map((row) => ({
      id: row.card.id,
      slug: row.card.slug,
      firstName: row.card.firstName,
      lastName: row.card.lastName,
      position: row.card.position,
      email: row.card.email,
      departmentId: row.card.departmentId,
      departmentName: row.departmentName,
      userId: row.card.userId,
      holderName: row.holderName,
      memberId: row.memberId,
      inviteId: row.card.userId ? null : row.inviteId,
      subscriptionStatus: row.subscriptionStatus
        ? effectiveSubscriptionStatus(
            row.subscriptionStatus,
            null,
            row.periodEnd
          )
        : null,
      periodEnd: row.periodEnd?.toISOString() ?? null,
      inviteStatus: row.card.userId ? null : row.inviteStatus,
      inviteEmail: row.card.userId ? null : row.inviteEmail,
      contactCount: countByCard.get(row.card.id) ?? 0,
      state: row.card.userId
        ? 'active'
        : row.inviteStatus === 'pending'
          ? 'pending'
          : 'vacant',
    })),
  };
}

export async function listCardHolders(cardId: string) {
  const rows = await db
    .select()
    .from(cardAssignment)
    .where(eq(cardAssignment.cardId, cardId))
    .orderBy(desc(cardAssignment.startedAt));
  const assignmentIds = rows.map((row) => row.id);
  const counts = assignmentIds.length
    ? await db
        .select({
          id: contactExchange.cardAssignmentId,
          value: sql<number>`count(*)::int`,
        })
        .from(contactExchange)
        .where(inArray(contactExchange.cardAssignmentId, assignmentIds))
        .groupBy(contactExchange.cardAssignmentId)
    : [];
  const countByAssignment = new Map(
    counts.flatMap((row) => (row.id ? [[row.id, row.value] as const] : []))
  );
  return {
    items: rows.map((row) => ({
      id: row.id,
      holderName: row.holderName,
      holderEmail: row.holderEmail,
      startedAt: row.startedAt.toISOString(),
      endedAt: row.endedAt?.toISOString() ?? null,
      contactCount: countByAssignment.get(row.id) ?? 0,
    })),
  };
}

export async function listDepartments(organizationId: string) {
  const rows = await db
    .select()
    .from(department)
    .where(eq(department.organizationId, organizationId))
    .orderBy(department.name);
  return { items: rows.map((row) => ({ id: row.id, name: row.name })) };
}

async function assertDepartmentNameFree(
  organizationId: string,
  name: string,
  exceptId?: string
) {
  const [taken] = await db
    .select({ id: department.id })
    .from(department)
    .where(
      and(
        eq(department.organizationId, organizationId),
        eq(department.name, name),
        exceptId ? ne(department.id, exceptId) : undefined
      )
    )
    .limit(1);
  if (taken) throw conflict('A department with this name already exists.');
}

export async function createDepartment(organizationId: string, name: string) {
  await assertDepartmentNameFree(organizationId, name);
  const [row] = await db
    .insert(department)
    .values({ organizationId, name })
    .returning();
  if (!row) throw new Error('Department insert returned no row.');
  return { id: row.id, name: row.name };
}

export async function renameDepartment(
  organizationId: string,
  departmentId: string,
  name: string
) {
  await assertDepartmentNameFree(organizationId, name, departmentId);
  const [row] = await db
    .update(department)
    .set({ name, updatedAt: new Date() })
    .where(
      and(
        eq(department.id, departmentId),
        eq(department.organizationId, organizationId)
      )
    )
    .returning();
  if (!row) throw notFound('Department');
  return { id: row.id, name: row.name };
}

export async function deleteDepartment(
  organizationId: string,
  departmentId: string
) {
  const deleted = await db
    .delete(department)
    .where(
      and(
        eq(department.id, departmentId),
        eq(department.organizationId, organizationId)
      )
    )
    .returning({ id: department.id });
  if (!deleted.length) throw notFound('Department');
}

export async function updateCompanySettings(
  organizationId: string,
  request: UpdateCompanySettingsRequest
) {
  await companyOrThrow(organizationId);
  const now = new Date();
  await db
    .update(organization)
    .set({
      name: request.name,
      ...(request.logoUrl !== undefined ? { logo: request.logoUrl } : {}),
    })
    .where(eq(organization.id, organizationId));
  await ensureCompanySetting(organizationId);
  await db
    .update(companySetting)
    .set({
      ...(request.website !== undefined
        ? { website: request.website ?? '' }
        : {}),
      ...(request.coverImageUrl !== undefined
        ? { coverUrl: request.coverImageUrl }
        : {}),
      updatedAt: now,
    })
    .where(eq(companySetting.organizationId, organizationId));
  await db
    .update(card)
    .set({
      company: request.name,
      ...(request.website !== undefined ? { website: request.website } : {}),
      updatedAt: now,
    })
    .where(eq(card.organizationId, organizationId));
}

export async function companyInsights(
  organizationId: string,
  since: Date,
  departmentId?: string,
  range: { days: number; timezoneOffset?: number } = { days: 30 }
) {
  const inDepartment = departmentId
    ? inArray(
        analytics.cardId,
        db
          .select({ id: card.id })
          .from(card)
          .where(eq(card.departmentId, departmentId))
      )
    : undefined;
  const contactsInDepartment = departmentId
    ? inArray(
        contactExchange.cardId,
        db
          .select({ id: card.id })
          .from(card)
          .where(eq(card.departmentId, departmentId))
      )
    : undefined;
  const viewDay = viewerDaySql(analytics.createdAt, range.timezoneOffset);
  const contactDay = viewerDaySql(
    contactExchange.createdAt,
    range.timezoneOffset
  );
  const [
    views,
    saves,
    clicks,
    contacts,
    members,
    viewCounts,
    contactCounts,
    dailyViewRows,
    dailyContactRows,
  ] = await Promise.all([
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(analytics)
      .where(
        and(
          eq(analytics.organizationId, organizationId),
          eq(analytics.type, 'view'),
          gte(analytics.createdAt, since),
          inDepartment
        )
      ),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(analytics)
      .where(
        and(
          eq(analytics.organizationId, organizationId),
          eq(analytics.type, 'save_action'),
          gte(analytics.createdAt, since),
          inDepartment
        )
      ),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(analytics)
      .where(
        and(
          eq(analytics.organizationId, organizationId),
          eq(analytics.type, 'link_click'),
          gte(analytics.createdAt, since),
          inDepartment
        )
      ),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(contactExchange)
      .innerJoin(card, eq(card.id, contactExchange.cardId))
      .where(
        and(
          eq(card.organizationId, organizationId),
          gte(contactExchange.createdAt, since),
          contactsInDepartment
        )
      ),
    db
      .select({
        id: cardAssignment.id,
        name: cardAssignment.holderName,
        departmentName: department.name,
      })
      .from(cardAssignment)
      .innerJoin(card, eq(card.id, cardAssignment.cardId))
      .leftJoin(department, eq(department.id, card.departmentId))
      .where(
        and(
          eq(card.organizationId, organizationId),
          departmentId ? eq(card.departmentId, departmentId) : undefined
        )
      ),
    db
      .select({
        id: analytics.cardAssignmentId,
        value: sql<number>`count(*)::int`,
      })
      .from(analytics)
      .where(
        and(
          eq(analytics.organizationId, organizationId),
          eq(analytics.type, 'view'),
          gte(analytics.createdAt, since),
          isNotNull(analytics.cardAssignmentId)
        )
      )
      .groupBy(analytics.cardAssignmentId),
    db
      .select({
        id: contactExchange.cardAssignmentId,
        value: sql<number>`count(*)::int`,
      })
      .from(contactExchange)
      .innerJoin(card, eq(card.id, contactExchange.cardId))
      .where(
        and(
          eq(card.organizationId, organizationId),
          gte(contactExchange.createdAt, since),
          isNotNull(contactExchange.cardAssignmentId)
        )
      )
      .groupBy(contactExchange.cardAssignmentId),
    db
      .select({
        date: viewDay.as('day'),
        count: sql<number>`count(*)::int`,
      })
      .from(analytics)
      .where(
        and(
          eq(analytics.organizationId, organizationId),
          eq(analytics.type, 'view'),
          gte(analytics.createdAt, since),
          inDepartment
        )
      )
      .groupBy(sql`day`),
    db
      .select({
        date: contactDay.as('day'),
        count: sql<number>`count(*)::int`,
      })
      .from(contactExchange)
      .innerJoin(card, eq(card.id, contactExchange.cardId))
      .where(
        and(
          eq(card.organizationId, organizationId),
          gte(contactExchange.createdAt, since),
          contactsInDepartment
        )
      )
      .groupBy(sql`day`),
  ]);
  const viewsByAssignment = new Map(
    viewCounts.map((row) => [row.id, row.value])
  );
  const contactsByAssignment = new Map(
    contactCounts.map((row) => [row.id, row.value])
  );
  const days = viewerRecentDays(range.days + 1, range.timezoneOffset);
  const fillDays = (rows: { date: string; count: number }[]) => {
    const byDay = new Map(rows.map((row) => [row.date, row.count]));
    return days.map((day) => ({
      date: day.key,
      count: byDay.get(day.key) ?? 0,
    }));
  };
  return {
    views: views[0]?.value ?? 0,
    saves: saves[0]?.value ?? 0,
    clicks: clicks[0]?.value ?? 0,
    contacts: contacts[0]?.value ?? 0,
    dailyViews: fillDays(dailyViewRows),
    dailyContacts: fillDays(dailyContactRows),
    members: members
      .map((row) => ({
        id: row.id,
        name: row.name,
        departmentName: row.departmentName,
        views: viewsByAssignment.get(row.id) ?? 0,
        contacts: contactsByAssignment.get(row.id) ?? 0,
      }))
      .sort(
        (a, b) =>
          b.contacts - a.contacts ||
          b.views - a.views ||
          a.name.localeCompare(b.name)
      ),
  };
}

export async function findRetiredCompanyLink(slug: string) {
  const [row] = await db
    .select({ companyName: organization.name })
    .from(retiredCardSlug)
    .innerJoin(card, eq(card.id, retiredCardSlug.cardId))
    .innerJoin(organization, eq(organization.id, card.organizationId))
    .where(eq(retiredCardSlug.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function propagateCompanyBrand(
  organizationId: string,
  field: 'splineUrl' | 'wallpaperUrl' | 'cardBackUrl',
  value: string
) {
  await db
    .update(companySetting)
    .set({ [field]: value, updatedAt: new Date() })
    .where(eq(companySetting.organizationId, organizationId));
  await db
    .update(card)
    .set({ [field]: value || null, updatedAt: new Date() })
    .where(eq(card.organizationId, organizationId));
}

export async function companyUsesCardImageKeys(keys: string[]) {
  if (!keys.length) return false;
  const [row] = await db
    .select({ id: companySetting.id })
    .from(companySetting)
    .where(
      or(
        inArray(companySetting.wallpaperUrl, keys),
        inArray(companySetting.cardBackUrl, keys)
      )
    )
    .limit(1);
  return Boolean(row);
}
