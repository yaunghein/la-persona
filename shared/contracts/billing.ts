import { z } from 'zod';
import { AdminPaginationQuery } from '~~/shared/contracts/collection';
import { StoredImageReference } from '~~/shared/contracts/card';
import type { SubscriptionStatus } from '~~/shared/utils/subscription';

/**
 * What a card holder pays for. The server derives plan, price and term from
 * the card's current subscription; clients never send amounts or dates.
 */
export const CARD_PAYMENT_KINDS = ['renewal', 'premium_upgrade'] as const;
export type CardPaymentKind = (typeof CARD_PAYMENT_KINDS)[number];

export type CardPaymentScenario =
  | 'trial_to_standard_renewal'
  | 'trial_to_premium_upgrade'
  | 'standard_renewal'
  | 'premium_renewal'
  | 'standard_to_premium_upgrade_active'
  | 'standard_to_premium_upgrade_expired';

export const CardPaymentQuoteQuery = z.object({
  kind: z.enum(CARD_PAYMENT_KINDS),
});

export type CardPaymentQuoteLine = {
  label: string;
  amountMinor: number;
  isFree: boolean;
};

export type CardPaymentQuote = {
  kind: CardPaymentKind;
  scenario: CardPaymentScenario;
  planCode: 'standard' | 'premium';
  currency: string;
  lines: CardPaymentQuoteLine[];
  totalAmountMinor: number;
};

export const CreateCardPaymentRequest = z.object({
  kind: z.enum(CARD_PAYMENT_KINDS),
  receiptUrl: StoredImageReference.pipe(
    z.string({ message: 'Please upload a payment receipt.' })
  ),
});

export type CreateCardPaymentRequest = z.infer<typeof CreateCardPaymentRequest>;

export type CardPaymentReceipt = {
  paymentId: string;
  status: 'submitted';
  cardRequestId: string | null;
};

/** The subscription panel on a card: current state and time left. */
export type CardSubscriptionOverview = {
  status: SubscriptionStatus | null;
  planCode: string | null;
  isTrial: boolean;
  daysLeft: number | null;
};

export type SubscriptionPlanSummary = {
  code: string;
  name: string;
  billingCycle: string;
  priceMinor: number;
  currency: string;
  isActive: boolean;
};

export type BillingHistoryEntry = {
  id: string;
  paymentId: string;
  description: string;
  status: string;
  amountMinor: number;
  currency: string;
  startAt: string;
  endAt: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
};

export const PaymentRouteParams = z.object({
  paymentId: z.string().trim().min(1),
});

export const PAYMENT_STATUSES = ['submitted', 'approved', 'rejected'] as const;

export const ListPaymentsQuery = AdminPaginationQuery.extend({
  status: z.enum(PAYMENT_STATUSES).optional(),
});

/** Thakhin decides a submitted payment. */
export const ReviewPaymentRequest = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('approved'),
    note: z.string().trim().max(1000).optional(),
  }),
  z.object({
    status: z.literal('rejected'),
    reason: z.string().trim().max(1000).optional(),
    note: z.string().trim().max(1000).optional(),
  }),
]);

export type ReviewPaymentRequest = z.infer<typeof ReviewPaymentRequest>;

export type ListPaymentsQuery = z.infer<typeof ListPaymentsQuery>;

export type PaymentForReview = {
  id: string;
  organizationId: string;
  paidByUserId: string;
  payerName: string | null;
  payerEmail: string | null;
  receiptUrl: string;
  status: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  linkedRequestId: string | null;
  linkedRequestStatus: string | null;
  itemCount: number;
  totalAmountMinor: number;
  currency: string | null;
  items: {
    cardId: string;
    planCode: string;
    amountMinor: number;
    currency: string;
    startAt: string;
    endAt: string;
  }[];
};
