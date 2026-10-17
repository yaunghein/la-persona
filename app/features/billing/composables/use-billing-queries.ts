import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import type {
  BillingHistoryEntry,
  CardPaymentKind,
  CardPaymentQuote,
  CardPaymentReceipt,
  CardPricing,
  CardSubscriptionOverview,
  CreateCardPaymentRequest,
  ListPaymentsQuery,
  PaymentForReview,
  ReviewPaymentRequest,
  SubscriptionPlanSummary,
} from '~~/shared/contracts/billing';
import type { Collection, Page } from '~~/shared/contracts/collection';
import { adminQueryKeys } from '~/features/admin/composables/use-admin-queries';
import { cardQueryKeys } from '~/features/card/composables/use-card-queries';

export const billingQueryKeys = {
  all: ['billing'] as const,
  plans: () => [...billingQueryKeys.all, 'plans'] as const,
  cardPricing: () => [...billingQueryKeys.all, 'card-pricing'] as const,
  cardSubscription: (cardSlug: string) =>
    [...billingQueryKeys.all, 'card-subscription', cardSlug] as const,
  paymentQuote: (cardSlug: string, kind: CardPaymentKind) =>
    [...billingQueryKeys.all, 'payment-quote', cardSlug, kind] as const,
  history: (organizationSlug: string) =>
    [...billingQueryKeys.all, 'history', organizationSlug] as const,
  reviewQueue: (query: Partial<ListPaymentsQuery>) =>
    [...billingQueryKeys.all, 'review-queue', query] as const,
};

export function useSubscriptionPlansQuery() {
  return useQuery({
    queryKey: billingQueryKeys.plans(),
    queryFn: () =>
      $fetch<Collection<SubscriptionPlanSummary>>('/api/subscription-plans'),
    select: (collection) => collection.items,
  });
}

export function useCardPricingQuery() {
  return useQuery({
    queryKey: billingQueryKeys.cardPricing(),
    queryFn: () => $fetch<CardPricing>('/api/card-pricing'),
  });
}

export function useCardSubscriptionQuery(
  cardSlug: MaybeRefOrGetter<string>,
  options: { enabled?: MaybeRefOrGetter<boolean> } = {}
) {
  return useQuery({
    queryKey: computed(() =>
      billingQueryKeys.cardSubscription(toValue(cardSlug))
    ),
    queryFn: () =>
      $fetch<CardSubscriptionOverview | null>(
        `/api/cards/${toValue(cardSlug)}/subscription`
      ),
    enabled: () => !!toValue(cardSlug) && toValue(options.enabled ?? true),
  });
}

export function useCardPaymentQuoteQuery(
  cardSlug: MaybeRefOrGetter<string>,
  kind: MaybeRefOrGetter<CardPaymentKind | null>
) {
  return useQuery({
    queryKey: computed(() =>
      billingQueryKeys.paymentQuote(
        toValue(cardSlug),
        toValue(kind) ?? 'renewal'
      )
    ),
    queryFn: () =>
      $fetch<CardPaymentQuote>(
        `/api/cards/${toValue(cardSlug)}/payment-quote`,
        {
          query: { kind: toValue(kind) },
        }
      ),
    enabled: () => !!toValue(cardSlug) && !!toValue(kind),
  });
}

export function useSubmitCardPaymentMutation(
  cardSlug: MaybeRefOrGetter<string>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateCardPaymentRequest) =>
      $fetch<CardPaymentReceipt>(`/api/cards/${toValue(cardSlug)}/payments`, {
        method: 'POST',
        body: request,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: billingQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: cardQueryKeys.all }),
      ]);
    },
  });
}

export function useBillingHistoryQuery(
  organizationSlug: MaybeRefOrGetter<string>
) {
  return useQuery({
    queryKey: computed(() =>
      billingQueryKeys.history(toValue(organizationSlug))
    ),
    queryFn: () =>
      $fetch<Collection<BillingHistoryEntry>>(
        `/api/organizations/${toValue(organizationSlug)}/payments`
      ),
    select: (collection) => collection.items,
    enabled: () => !!toValue(organizationSlug),
  });
}

/** Thakhin: payments waiting for (or past) a decision. */
export function usePaymentReviewQueueQuery(
  query: MaybeRefOrGetter<Partial<ListPaymentsQuery>> = {}
) {
  return useQuery({
    queryKey: computed(() => billingQueryKeys.reviewQueue(toValue(query))),
    queryFn: () =>
      $fetch<Page<PaymentForReview>>('/api/admin/payments', {
        query: toValue(query),
      }),
  });
}

export function useReviewPaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      paymentId,
      decision,
    }: {
      paymentId: string;
      decision: ReviewPaymentRequest;
    }) =>
      $fetch<unknown>(`/api/admin/payments/${paymentId}` as string, {
        method: 'PATCH',
        body: decision,
      }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: billingQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.all }),
      ]),
  });
}
