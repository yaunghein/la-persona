import { eq } from 'drizzle-orm';
import { organization } from '~~/server/db/schema';
import {
  cardHasSubmittedPayment,
  findActivePlan,
  findCardForPeriod,
  findPaymentItemForEdit,
  findPlan,
  findSubscriptionForPeriod,
  insertStaffPeriod,
  listCardPeriodRows,
  listUserPeriodRows,
  runInTransaction,
  saveCurrentPeriod,
  updatePaymentItemAmount,
} from '~~/server/features/billing/billing.repository';
import type {
  AddCardPeriodRequest,
  CardPeriod,
  UpdatePaymentItemRequest,
} from '~~/shared/contracts/billing';
import type { Collection } from '~~/shared/contracts/collection';

function cardName(firstName: string | null, lastName: string | null) {
  return [firstName, lastName].filter(Boolean).join(' ');
}

function toPeriod(row: {
  id: string;
  paymentId: string;
  cardId: string | null;
  cardFirstName: string | null;
  cardLastName: string | null;
  planCode: string;
  planName: string | null;
  amountMinor: number;
  currency: string;
  status: string;
  startAt: Date;
  endAt: Date;
}): CardPeriod {
  return {
    id: row.id,
    paymentId: row.paymentId,
    cardId: row.cardId ?? '',
    cardName:
      cardName(row.cardFirstName, row.cardLastName) || 'Deleted card',
    planCode: row.planCode,
    planName: row.planName,
    amountMinor: row.amountMinor,
    currency: row.currency,
    status: row.status,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
  };
}

export async function listCardPeriods(
  cardId: string
): Promise<Collection<CardPeriod>> {
  return { items: (await listCardPeriodRows(cardId)).map(toPeriod) };
}

export async function listUserPeriods(
  userId: string
): Promise<Collection<CardPeriod>> {
  return { items: (await listUserPeriodRows(userId)).map(toPeriod) };
}

function addMonths(base: Date, months: number) {
  const result = new Date(base);
  result.setMonth(result.getMonth() + months);
  return result;
}

function addYears(base: Date, years: number) {
  const result = new Date(base);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

/** The next period starts when the current one ends, or now if that date has passed. */
function nextPeriodStart(
  subscription: {
    status: string;
    isTrial: boolean;
    trialEndAt: Date | null;
    currentPeriodEndAt: Date | null;
  } | null,
  now: Date
) {
  const end = !subscription
    ? null
    : subscription.isTrial || subscription.status === 'trial'
      ? subscription.trialEndAt
      : subscription.currentPeriodEndAt;
  return end && end > now ? end : now;
}

function displayedEnd(
  subscription: {
    status: string;
    isTrial: boolean;
    trialEndAt: Date | null;
    currentPeriodEndAt: Date | null;
  } | null
) {
  if (!subscription) return null;
  return subscription.isTrial || subscription.status === 'trial'
    ? subscription.trialEndAt
    : subscription.currentPeriodEndAt;
}

function parseDate(value: string, field: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw badRequest(`Enter a valid ${field}.`);
  }
  return date;
}

export async function addCardPeriod(
  cardId: string,
  request: AddCardPeriodRequest
) {
  const now = new Date();
  return runInTransaction(async (tx) => {
    const card = await findCardForPeriod(tx, cardId);
    if (!card) throw notFound('Card');
    const [org] = await tx
      .select({ type: organization.type })
      .from(organization)
      .where(eq(organization.id, card.organizationId))
      .limit(1);
    if (org?.type !== 'personal') {
      throw conflict(
        'Only personal cards can be extended here.',
        'not_personal_card'
      );
    }
    if (!card.userId) {
      throw conflict(
        'Claim the card before adding a period.',
        'card_unclaimed'
      );
    }
    const subscription = await findSubscriptionForPeriod(tx, cardId);
    if (subscription?.status === 'pending_approval') {
      throw conflict(
        'Finish the payment review before adding a period.',
        'payment_pending'
      );
    }
    if (await cardHasSubmittedPayment(tx, cardId)) {
      throw conflict(
        'Finish the payment review before adding a period.',
        'payment_pending'
      );
    }

    const startAt = nextPeriodStart(subscription, now);
    const hasEnd = Boolean(displayedEnd(subscription));
    let planCode = subscription?.planCode || 'standard';
    let endAt: Date;
  let amountMinor = 0;
  let currency = 'MMK';
  const status = 'approved';

  if (request.kind === 'paid') {
    const plan = await findActivePlan(tx, request.planCode);
    if (!plan) throw conflict('Selected subscription plan is invalid');
    planCode = plan.code;
    currency = plan.currency;
    amountMinor = request.amountMinor;
      endAt = addYears(startAt, 1);
    } else if ('endAt' in request) {
      if (hasEnd) {
        throw conflict(
          'This card already has an end date. Add months instead.',
          'period_has_end'
        );
      }
      endAt = parseDate(request.endAt, 'endAt');
      if (endAt <= now) {
        throw badRequest('The end date must be after today.');
      }
      const plan = await findPlan(tx, planCode);
      if (!plan) throw conflict('Selected subscription plan is invalid');
      currency = plan.currency;
    } else {
      if (!hasEnd) {
        throw conflict(
          'This card has no end date. Set the end date instead.',
          'period_missing_end'
        );
      }
      endAt = addMonths(startAt, request.months);
      const plan = await findPlan(tx, planCode);
      if (!plan) throw conflict('Selected subscription plan is invalid');
      currency = plan.currency;
    }

    const created = await insertStaffPeriod(tx, {
      organizationId: card.organizationId,
      paidByUserId: card.userId,
      status,
      cardId: card.id,
      planCode,
      startAt,
      endAt,
      amountMinor,
      currency,
      now,
    });
    await saveCurrentPeriod(tx, {
      cardId: card.id,
      planCode,
      startAt,
      endAt,
      itemId: created.itemId,
      now,
    });
    return { id: created.itemId, paymentId: created.paymentId, startAt, endAt };
  });
}

export async function updateCardPeriodItem(
  itemId: string,
  request: UpdatePaymentItemRequest
) {
  const now = new Date();
  return runInTransaction(async (tx) => {
    const row = await findPaymentItemForEdit(tx, itemId);
    if (!row) throw notFound('Payment item');

    await updatePaymentItemAmount(tx, itemId, {
      amountMinor: request.amountMinor,
      now,
    });

    return {
      id: itemId,
      amountMinor: request.amountMinor,
      startAt: row.startAt,
      endAt: row.endAt,
    };
  });
}
