import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import type {
  CardDetail,
  CardRequestForReview,
  CardRequestReceipt,
  CardUpdateRequestForReview,
  CreateCardRequestRequest,
  ListCardRequestsQuery,
  ListCardUpdateRequestsQuery,
  PublicCard,
  ReviewCardRequestRequest,
  UpdateCardRequest,
} from '~~/shared/contracts/card';
import type { Collection, Page } from '~~/shared/contracts/collection';

/** Typed as plain strings so Nitro's route-type inference doesn't explode on dynamic paths. */
function cardResourceUrl(cardSlug: string): string {
  return `/api/cards/${cardSlug}`;
}

function adminRequestUrl(
  kind: 'card-requests' | 'card-update-requests',
  requestId: string
): string {
  return `/api/admin/${kind}/${requestId}`;
}

export const cardQueryKeys = {
  all: ['cards'] as const,
  workspace: () => [...cardQueryKeys.all, 'workspace'] as const,
  organization: (organizationSlug: string) =>
    [...cardQueryKeys.all, 'organization', organizationSlug] as const,
  detail: (cardSlug: string) =>
    [...cardQueryKeys.all, 'detail', cardSlug] as const,
  requests: (query: Partial<ListCardRequestsQuery>) =>
    [...cardQueryKeys.all, 'requests', query] as const,
  updateRequests: (query: Partial<ListCardUpdateRequestsQuery>) =>
    [...cardQueryKeys.all, 'update-requests', query] as const,
};

/** Every card the user holds across personal and community workspaces. */
export function useWorkspaceCardsQuery(
  options: { enabled?: MaybeRefOrGetter<boolean> } = {}
) {
  return useQuery({
    queryKey: cardQueryKeys.workspace(),
    queryFn: () => $fetch<Collection<CardDetail>>('/api/me/cards'),
    select: (collection) => collection.items,
    enabled: () => toValue(options.enabled ?? true),
  });
}

/** Managers get every card in the organization; members only their own. */
export function useOrganizationCardsQuery(
  organizationSlug: MaybeRefOrGetter<string>,
  options: { enabled?: MaybeRefOrGetter<boolean> } = {}
) {
  return useQuery({
    queryKey: computed(() =>
      cardQueryKeys.organization(toValue(organizationSlug))
    ),
    queryFn: () =>
      $fetch<Collection<CardDetail>>(
        `/api/organizations/${toValue(organizationSlug)}/cards`
      ),
    select: (collection) => collection.items,
    enabled: () =>
      !!toValue(organizationSlug) && toValue(options.enabled ?? true),
  });
}

export function useCardQuery(cardSlug: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => cardQueryKeys.detail(toValue(cardSlug))),
    queryFn: () => $fetch<CardDetail>(`/api/cards/${toValue(cardSlug)}`),
    enabled: () => !!toValue(cardSlug),
  });
}

export function useUpdateCardMutation(cardSlug: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: UpdateCardRequest) =>
      $fetch<CardDetail>(`/api/cards/${toValue(cardSlug)}`, {
        method: 'PATCH',
        body: changes,
      }),
    onSuccess: async (updated) => {
      queryClient.setQueryData(cardQueryKeys.detail(updated.slug), updated);
      await queryClient.invalidateQueries({ queryKey: cardQueryKeys.all });
    },
  });
}

export function useDeleteCardMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cardSlug: string) =>
      $fetch<void>(cardResourceUrl(cardSlug), { method: 'DELETE' }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: cardQueryKeys.all }),
  });
}

export function fetchPublicCard(cardSlug: string) {
  return $fetch<PublicCard>(`/api/public/cards/${cardSlug}`);
}

/** Buy a new card (new or existing design) with a payment receipt. */
export function useSubmitCardRequestMutation(
  organizationSlug: MaybeRefOrGetter<string>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateCardRequestRequest) =>
      $fetch<CardRequestReceipt>(
        `/api/organizations/${toValue(organizationSlug)}/card-requests`,
        { method: 'POST', body: request }
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: cardQueryKeys.all }),
  });
}

/** Thakhin: card requests to review. */
export function useCardRequestsQuery(
  query: MaybeRefOrGetter<Partial<ListCardRequestsQuery>> = {}
) {
  return useQuery({
    queryKey: computed(() => cardQueryKeys.requests(toValue(query))),
    queryFn: () =>
      $fetch<Page<CardRequestForReview>>('/api/admin/card-requests', {
        query: toValue(query),
      }),
  });
}

export function useCardUpdateRequestsQuery(
  query: MaybeRefOrGetter<Partial<ListCardUpdateRequestsQuery>> = {}
) {
  return useQuery({
    queryKey: computed(() => cardQueryKeys.updateRequests(toValue(query))),
    queryFn: () =>
      $fetch<Page<CardUpdateRequestForReview>>('/api/admin/card-update-requests', {
        query: toValue(query),
      }),
  });
}

export function useReviewCardRequestMutation(
  kind: 'card-requests' | 'card-update-requests' = 'card-requests'
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      status,
    }: { requestId: string } & ReviewCardRequestRequest) =>
      $fetch<unknown>(adminRequestUrl(kind, requestId), {
        method: 'PATCH',
        body: { status },
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: cardQueryKeys.all }),
  });
}
