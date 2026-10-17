import { nanoid } from 'nanoid';
import { env } from '~~/env';
import { sendPaymentSubmissionEmails } from '~~/server/features/billing/billing.notifications';
import {
  listActivePlansByCode,
  runInTransaction,
} from '~~/server/features/billing/billing.repository';
import {
  approveLinkedPayments,
  decidePendingCardRequest,
  findCardRequest,
  findDesignSourceCard,
  findRequesterEmail,
  insertApprovedCardForLegacyRequest,
  insertCardRequestWithPayment,
  listCardRequestsForReview,
  rejectLinkedPayments,
} from '~~/server/features/card/card-request.repository';
import { findPersonalOrganization } from '~~/server/features/auth/account.service';
import { splitPersonName } from '~~/shared/utils/person-name';
import { restoreSubscriptionsAfterRejection } from '~~/server/features/billing/subscription.repository';
import type {
  CardRequestForReview,
  CardRequestReceipt,
  CreateCardRequestRequest,
  ListCardRequestsQuery,
  RequestedCardDetails,
} from '~~/shared/contracts/card';
import type { Page } from '~~/shared/contracts/collection';
import { resolvedPhoneFields } from '~~/shared/utils/phone';
import { slugify } from '~~/shared/utils/slugify';
import { derivePlanCodeFromSource } from '~~/shared/utils/subscription';

/** New designs are always produced on the premium plan. */
const NEW_DESIGN_PLAN_CODE = 'premium';

function addYears(base: Date, years: number) {
  const result = new Date(base);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

async function requireActivePlan(planCode: string) {
  const [plan] = await listActivePlansByCode([planCode]);
  if (!plan) {
    throw conflict(
      `The "${planCode}" plan is not available right now.`,
      'plan_unavailable'
    );
  }
  return plan;
}

function cardFromRequestedDetails(details: RequestedCardDetails) {
  const { firstName, lastName } = splitPersonName(details.name);
  const phone = resolvedPhoneFields(details.phone, details.phoneCountryCode);
  return {
    firstName,
    lastName,
    slug: `${slugify(details.name || `${firstName} ${lastName}`)}-${nanoid(6)}`,
    company: details.company,
    phone: phone.phone,
    phoneCountryCode: phone.phoneCountryCode,
    email: details.email,
    website: details.website,
    socials: details.socials,
  };
}

/** The request snapshot Thakhin reviews (and that legacy approval rebuilds from). */
function requestSnapshot(details: RequestedCardDetails, sourceCardId?: string) {
  return {
    name: details.name,
    position: details.position || undefined,
    company: details.company || undefined,
    phone: details.phone || undefined,
    phoneCountryCode: details.phoneCountryCode || undefined,
    email: details.email || undefined,
    website: details.website || undefined,
    socials: details.socials,
    ...(sourceCardId ? { sourceCardId } : {}),
  };
}

/**
 * A member buys a new card. The card is created immediately (pending
 * approval) together with its first-year payment, priced by the server.
 */
export async function submitCardRequest(params: {
  organizationId: string;
  requester: { userId: string; email: string; name: string };
  request: CreateCardRequestRequest;
}) {
  const { request, organizationId, requester } = params;
  const now = new Date();
  const term = { startAt: now, endAt: addYears(now, 1) };

  let design: {
    splineUrl: string | null;
    cardBackUrl: string | null;
    wallpaperUrl: string | null;
  } | null = null;
  let planCode = NEW_DESIGN_PLAN_CODE;
  if (request.type === 'existing_design') {
    const source = await findDesignSourceCard(
      request.sourceCardId,
      organizationId
    );
    if (!source)
      throw badRequest(
        'Selected card design is invalid.',
        'invalid_design_source'
      );
    design = {
      splineUrl: source.card.splineUrl,
      cardBackUrl: source.card.cardBackUrl,
      wallpaperUrl: source.card.wallpaperUrl,
    };
    planCode = derivePlanCodeFromSource(source.subscription);
  }
  const plan = await requireActivePlan(planCode);

  const receipt = await insertCardRequestWithPayment({
    organizationId,
    plan,
    term,
    card: {
      ...cardFromRequestedDetails(request.card),
      position:
        request.card.position ||
        (request.type === 'existing_design' ? 'Professional' : ''),
      ...design,
      organizationId,
      userId: requester.userId,
    },
    request: {
      type: request.type,
      cardData: requestSnapshot(
        request.card,
        request.type === 'existing_design' ? request.sourceCardId : undefined
      ),
      paymentReceiptUrl: request.receiptUrl,
      userId: requester.userId,
    },
  });

  const isNewDesign = request.type === 'new_design';
  const planLabel = plan.code.charAt(0).toUpperCase() + plan.code.slice(1);
  const emails = sendPaymentSubmissionEmails({
    payerEmail: requester.email,
    payerName: requester.name || requester.email,
    submissionTitle: isNewDesign
      ? 'New Card Design Request'
      : `Existing Design ${planLabel} Request`,
    userBodyText: `${
      isNewDesign
        ? 'Thank you for submitting your new card design request and payment receipt. We have received everything and will review it shortly.'
        : `Thank you for submitting your existing-design ${plan.code} request and payment receipt. We have received everything and will review it shortly.`
    }\n\nRequest ID: ${receipt.requestId}\nPayment ID: ${receipt.paymentId}`,
    teamDetailLines: [
      `Request type: ${isNewDesign ? 'New card design' : `Existing design → ${plan.code}`}`,
      `Plan: ${plan.code}`,
    ],
    teamRequestsDashboardUrl: new URL('/thakhin/requests', env.BASE_URL).href,
  });

  const result: CardRequestReceipt = { ...receipt, planCode: plan.code };
  return { receipt: result, emails };
}

export async function reviewCardRequest(
  requestId: string,
  status: 'approved' | 'declined'
) {
  const request = await findCardRequest(requestId);
  if (!request) throw notFound('Card request');
  if (request.status !== 'pending') {
    throw conflict(
      `Only pending requests can be ${status}.`,
      'card_request_decided'
    );
  }
  if (status === 'approved' && !request.paymentReceiptUrl?.trim()) {
    throw conflict(
      'Cannot approve a request without a payment receipt.',
      'receipt_missing'
    );
  }

  const now = new Date();
  const paymentIds = await runInTransaction(async (tx) => {
    const decided = await decidePendingCardRequest(tx, requestId, status);
    if (!decided) {
      throw conflict(
        `Only pending requests can be ${status}.`,
        'card_request_decided'
      );
    }

    if (status === 'declined') {
      const rejected = await rejectLinkedPayments(tx, requestId);
      await restoreSubscriptionsAfterRejection(tx, rejected, now);
      return rejected;
    }

    const approved = await approveLinkedPayments(tx, requestId);
    if (approved.length || request.type !== 'new_design') return approved;

    // Requests from before cards were created at submission time.
    const personalOrganization = await findPersonalOrganization(request.userId);
    if (!personalOrganization) {
      throw conflict(
        'Request owner has no personal organization.',
        'no_personal_organization'
      );
    }
    const snapshot = request.cardData || {};
    await insertApprovedCardForLegacyRequest(tx, {
      request,
      organizationId: personalOrganization.id,
      plan: await requireActivePlan(NEW_DESIGN_PLAN_CODE),
      term: { startAt: now, endAt: addYears(now, 1) },
      card: {
        ...cardFromRequestedDetails({
          name: snapshot.name || '',
          position: snapshot.position || null,
          company: snapshot.company || null,
          phone: snapshot.phone || null,
          phoneCountryCode: snapshot.phoneCountryCode || null,
          email: snapshot.email || null,
          website: snapshot.website || null,
          socials: snapshot.socials || [],
        }),
        position: snapshot.position || 'Professional',
        organizationId: personalOrganization.id,
        userId: request.userId,
      },
    });
    return approved;
  });

  return {
    requestId,
    status,
    paymentIds,
    requesterEmail: await findRequesterEmail(request.userId),
  };
}

export async function listCardRequests(
  query: ListCardRequestsQuery
): Promise<Page<CardRequestForReview>> {
  const { rows, payments, total } = await listCardRequestsForReview(query);

  const latestPaymentByRequestId = new Map<string, (typeof payments)[number]>();
  for (const payment of payments) {
    const requestId =
      payment.requestId ||
      payment.note?.match(/^(?:New|Existing) design request \(([^)]+)\)$/)?.[1];
    if (!requestId) continue;
    const current = latestPaymentByRequestId.get(requestId);
    if (!current || payment.createdAt > current.createdAt) {
      latestPaymentByRequestId.set(requestId, payment);
    }
  }

  return {
    items: rows.map(({ request, requesterName, requesterEmail }) => {
      const payment = latestPaymentByRequestId.get(request.id);
      return {
        id: request.id,
        type: request.type,
        status: request.status,
        paymentReceiptUrl: request.paymentReceiptUrl,
        cardData: request.cardData || {},
        requesterName,
        requesterEmail,
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString(),
        paymentId: payment?.id ?? null,
        paymentStatus: payment?.status ?? null,
      };
    }),
    total,
    limit: query.limit,
    offset: query.offset,
  };
}
