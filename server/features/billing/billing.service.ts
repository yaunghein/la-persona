import {
  activatePaidSubscription,
  decideSubmittedPayment,
  findCardSubscription,
  findPayer,
  findPaymentForReview,
  insertCardPayment,
  listOrganizationBillingHistory,
  listActivePlansByCode,
  linkedCardRequestId,
  listPaymentItems,
  listPaymentsForReview,
  listSubscriptionPlans,
  runInTransaction,
} from '~~/server/features/billing/billing.repository';
import {
  resolveCardSubscriptionState,
  toSubscriptionOverview,
} from '~~/server/features/billing/card-subscription-state';
import {
  isPremiumUpgrade,
  quoteCardPayment,
  resolveCardPaymentScenario,
  resolvePaidTerm,
  type CardPricingTable,
} from '~~/server/features/billing/card-payment-plan';
import {
  sendPaymentApprovedEmail,
  sendPaymentRejectedEmail,
  sendPaymentSubmissionEmails,
} from '~~/server/features/billing/billing.notifications';
import type { CardWithContext } from '~~/server/features/card/card.repository';
import { restoreSubscriptionsAfterRejection } from '~~/server/features/billing/subscription.repository';
import type {
  BillingHistoryEntry,
  CardPaymentKind,
  CardPaymentQuote,
  CardSubscriptionOverview,
  ListPaymentsQuery,
  PaymentForReview,
  ReviewPaymentRequest,
  SubscriptionPlanSummary,
} from '~~/shared/contracts/billing';
import type { Collection, Page } from '~~/shared/contracts/collection';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

export async function listPlans(): Promise<
  Collection<SubscriptionPlanSummary>
> {
  return { items: await listSubscriptionPlans() };
}

/** Standard and premium plan prices. */
export async function loadCardPricing(): Promise<CardPricingTable> {
  const plans = await listActivePlansByCode(['standard', 'premium']);
  const standard = plans.find((plan) => plan.code === 'standard');
  const premium = plans.find((plan) => plan.code === 'premium');
  if (!standard || !premium) {
    throw conflict(
      'Active standard/premium pricing is not configured.',
      'pricing_not_configured'
    );
  }
  return {
    currency: standard.currency.toUpperCase(),
    standardPlanPriceMinor: standard.priceMinor,
    premiumPlanPriceMinor: premium.priceMinor,
  };
}

function assertPersonalCard(target: CardWithContext) {
  if (target.organization.type === ORGANIZATION_TYPES.COMMUNITY) {
    throw forbidden(
      'Community cards are covered by the community.',
      'community_card'
    );
  }
}

async function cardSubscriptionState(target: CardWithContext) {
  return resolveCardSubscriptionState(
    await findCardSubscription(target.card.id),
    target.card.createdAt
  );
}

export async function describeCardSubscription(
  target: CardWithContext
): Promise<CardSubscriptionOverview | null> {
  if (target.organization.type === ORGANIZATION_TYPES.COMMUNITY) return null;
  return toSubscriptionOverview(await cardSubscriptionState(target));
}

export async function quoteCardPaymentFor(
  target: CardWithContext,
  kind: CardPaymentKind
): Promise<CardPaymentQuote> {
  assertPersonalCard(target);
  const state = await cardSubscriptionState(target);
  return quoteCardPayment(
    kind,
    resolveCardPaymentScenario(kind, state),
    await loadCardPricing()
  );
}

function cardHolderName(target: CardWithContext) {
  return [target.card.firstName, target.card.lastName]
    .filter(Boolean)
    .join(' ');
}

/**
 * Records a receipt for a renewal or premium upgrade. Price and term come
 * from the server-side quote; nothing monetary is taken from the client.
 */
export async function submitCardPayment(params: {
  target: CardWithContext;
  kind: CardPaymentKind;
  receiptUrl: string;
  payer: { userId: string; email: string; name: string };
}) {
  const { target, kind, payer } = params;
  assertPersonalCard(target);

  const state = await cardSubscriptionState(target);
  const scenario = resolveCardPaymentScenario(kind, state);
  const quote = quoteCardPayment(kind, scenario, await loadCardPricing());
  const term = resolvePaidTerm(scenario, state);
  const upgrade = isPremiumUpgrade(scenario);
  const { card } = target;

  const receipt = await insertCardPayment({
    organizationId: card.organizationId,
    paidByUserId: payer.userId,
    receiptUrl: params.receiptUrl,
    note: `Card detail payment (${scenario})`,
    line: {
      cardId: card.id,
      planCode: quote.planCode,
      ...term,
      amountMinor: quote.totalAmountMinor,
      currency: quote.currency,
    },
    designRequest: upgrade
      ? {
          type: 'existing_design',
          status: 'pending',
          paymentReceiptUrl: params.receiptUrl,
          userId: payer.userId,
          cardData: {
            name: cardHolderName(target),
            position: card.position || undefined,
            company: card.company || undefined,
            phone: card.phone || undefined,
            phoneCountryCode: card.phoneCountryCode || undefined,
            email: card.email || undefined,
            website: card.website || undefined,
            socials: card.socials || [],
            sourceCardId: card.id,
          },
        }
      : null,
  });

  const submissionTitle = upgrade
    ? 'premium upgrade payment'
    : 'subscription renewal payment';
  const userBodyText = upgrade
    ? 'Thank you for submitting your Premium upgrade payment and receipt. We have received it and will review it shortly.'
    : 'Thank you for submitting your subscription renewal payment and receipt. We have received it and will review it shortly.';

  const emails = sendPaymentSubmissionEmails({
    payerEmail: payer.email,
    payerName: payer.name || payer.email,
    submissionTitle,
    userBodyText: `${userBodyText}\n\nReference: ${receipt.paymentId}`,
    teamDetailLines: [
      `Payment ID: ${receipt.paymentId}`,
      `Organization: ${target.organization.name}`,
      `Card: ${cardHolderName(target)} — plan: ${quote.planCode}`,
      ...(receipt.cardRequestId
        ? [`Card request ID: ${receipt.cardRequestId}`]
        : []),
    ],
  });

  return { ...receipt, quote, emails };
}

export async function listBillingHistory(
  organizationId: string
): Promise<Collection<BillingHistoryEntry>> {
  const rows = await listOrganizationBillingHistory(organizationId);
  return {
    items: rows.map((row) => ({
      id: row.itemId,
      paymentId: row.paymentId,
      description: row.planName || row.planCode,
      status: row.paymentStatus,
      amountMinor: row.amountMinor,
      currency: row.currency || 'MMK',
      startAt: row.startAt.toISOString(),
      endAt: row.endAt.toISOString(),
      dueDate: row.endAt.toISOString(),
      createdAt: row.paymentCreatedAt.toISOString(),
      updatedAt: row.paymentUpdatedAt.toISOString(),
    })),
  };
}

/**
 * Thakhin approves or rejects a renewal/upgrade payment. Payments that belong
 * to a card request are decided together with that request instead.
 */
export async function reviewPayment(
  paymentId: string,
  decision: ReviewPaymentRequest
) {
  const now = new Date();
  const result = await runInTransaction(async (tx) => {
    const payment = await findPaymentForReview(tx, paymentId);
    if (!payment) throw notFound('Payment');
    if (payment.status !== 'submitted') {
      throw conflict('This payment was already processed.', 'payment_decided');
    }
    if (linkedCardRequestId(payment)) {
      throw conflict(
        'This payment is linked to a card request. Decide it from the Requests page.',
        'payment_linked_to_request'
      );
    }

    if (decision.status === 'approved') {
      const items = await listPaymentItems(tx, payment.id);
      if (!items.length) {
        throw conflict('Payment has no subscription items.', 'payment_empty');
      }
      const updated = await decideSubmittedPayment(tx, payment.id, {
        status: 'approved',
        note: decision.note ?? payment.note,
      });
      if (!updated)
        throw conflict(
          'This payment was already processed.',
          'payment_decided'
        );
      for (const item of items) await activatePaidSubscription(tx, item, now);
      return { payment: updated, itemCount: items.length };
    }

    const details = [decision.reason, decision.note]
      .filter(Boolean)
      .join(' — ');
    const updated = await decideSubmittedPayment(tx, payment.id, {
      status: 'rejected',
      note: [payment.note, details ? `\nRejected: ${details}` : '']
        .filter(Boolean)
        .join(''),
    });
    if (!updated)
      throw conflict('This payment was already processed.', 'payment_decided');
    await restoreSubscriptionsAfterRejection(tx, [payment.id], now);
    return { payment: updated, itemCount: 0 };
  });

  const payer = await findPayer(result.payment.paidByUserId);
  const payerEmail = payer?.email?.trim() || '';
  const payerName = payer?.name?.trim() || payerEmail;
  const reference = result.payment.id;

  const emails = !payerEmail
    ? null
    : decision.status === 'approved'
      ? sendPaymentApprovedEmail({
          payerEmail,
          payerName,
          bodyText: `Your subscription payment has been approved (reference: ${reference}). Your updated subscription term is now active in the platform.\n\nThank you for choosing LA PERSONA.`,
        })
      : sendPaymentRejectedEmail({
          payerEmail,
          payerName,
          bodyText: `We were not able to approve your subscription payment (reference: ${reference}).${
            decision.reason || decision.note
              ? `\n\nDetails:\n${[decision.reason, decision.note].filter(Boolean).join('\n')}`
              : ''
          }\n\nIf you believe this is a mistake, please reply to this email or contact us through your usual LA PERSONA channel.`,
        });

  return { ...result, payerEmail, emails };
}

export async function listPaymentsAwaitingReview(
  query: ListPaymentsQuery
): Promise<Page<PaymentForReview>> {
  const { payments, items, requests, total } =
    await listPaymentsForReview(query);
  const requestStatusById = new Map(
    requests.map((row) => [row.id, row.status])
  );

  return {
    items: payments.map(({ payment, payerName, payerEmail }) => {
      const lines = items.filter((item) => item.paymentId === payment.id);
      const linkedRequestId = linkedCardRequestId(payment);
      return {
        id: payment.id,
        organizationId: payment.organizationId,
        paidByUserId: payment.paidByUserId,
        payerName,
        payerEmail,
        receiptUrl: payment.receiptUrl,
        status: payment.status,
        note: payment.note,
        createdAt: payment.createdAt.toISOString(),
        updatedAt: payment.updatedAt.toISOString(),
        linkedRequestId,
        linkedRequestStatus: linkedRequestId
          ? (requestStatusById.get(linkedRequestId) ?? null)
          : null,
        itemCount: lines.length,
        totalAmountMinor: lines.reduce(
          (sum, item) => sum + (item.amountMinor || 0),
          0
        ),
        currency: lines[0]?.currency ?? null,
        items: lines.map((item) => ({
          cardId: item.cardId,
          planCode: item.planCode,
          amountMinor: item.amountMinor,
          currency: item.currency,
          startAt: item.startAt.toISOString(),
          endAt: item.endAt.toISOString(),
        })),
      };
    }),
    total,
    limit: query.limit,
    offset: query.offset,
  };
}
