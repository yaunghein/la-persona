import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/vue-query';
import type {
  AdminUserDetail,
  AdminUserSummary,
  CreateUserRequest,
  UpdateUserRequest,
} from '~~/shared/contracts/account';
import type {
  AdminActivityQuery,
  AdminChartRange,
  AdminCharts,
  AdminEventOption,
  AdminPersonActivity,
  AdminPersonEventActivity,
  AdminOverview,
  AdminRevenue,
  AdminRevenueRange,
  BackOfficeSearchResult,
} from '~~/shared/contracts/admin';
import type {
  AdminCardDetail,
  AdminCardSummary,
  CreateAdminCardRequest,
  UpdateAdminCardRequest,
} from '~~/shared/contracts/card';
import type {
  AddCardPeriodRequest,
  CardPeriod,
  UpdatePaymentItemRequest,
} from '~~/shared/contracts/billing';
import type { Collection } from '~~/shared/contracts/collection';
import type {
  BrandAsset,
  BrandAssetKind,
  CardImage,
  CardImageKind,
  CreateBrandAssetUploadRequest,
  CreateCardImageUploadRequest,
  StoredUpload,
  UploadTicket,
} from '~~/shared/contracts/media';
import type {
  FeedbackForReview,
  FeedbackKind,
} from '~~/shared/contracts/feedback';
import type {
  CreateOnboardingInvitationRequest,
  OnboardingInvitationSummary,
} from '~~/shared/contracts/onboarding';
import type {
  AdminOrganizationDetail,
  AdminOrganizationSummary,
  CreateOrganizationRequest,
  CreateOrganizerInvitationRequest,
  UpdateOrganizationRequest,
} from '~~/shared/contracts/organization';

/** Everything Thakhin shows lives under one root so a write can refresh it all. */
export const adminQueryKeys = {
  all: ['admin'] as const,
  overview: () => [...adminQueryKeys.all, 'overview'] as const,
  charts: (range: AdminChartRange) =>
    [...adminQueryKeys.all, 'overview', 'charts', range] as const,
  revenue: (range: AdminRevenueRange) =>
    [...adminQueryKeys.all, 'overview', 'revenue', range] as const,
  search: (term: string) => [...adminQueryKeys.all, 'search', term] as const,
  feedback: (kind: FeedbackKind | 'all') =>
    [...adminQueryKeys.all, 'feedback', kind] as const,
  organizations: () => [...adminQueryKeys.all, 'organizations'] as const,
  brandAssets: (organizationId: string) =>
    [...adminQueryKeys.all, 'brand-assets', organizationId] as const,
  cardImages: (name: string) =>
    [...adminQueryKeys.all, 'card-images', name] as const,
  uploads: () => [...adminQueryKeys.all, 'uploads'] as const,
  users: () => [...adminQueryKeys.all, 'users'] as const,
  activity: (filter: AdminActivityQuery) =>
    [...adminQueryKeys.all, 'activity', filter] as const,
  personEventActivity: (userId: string) =>
    [...adminQueryKeys.all, 'activity', 'person', userId] as const,
  events: () => [...adminQueryKeys.all, 'events'] as const,
  cards: (claimed?: boolean) =>
    [...adminQueryKeys.all, 'cards', claimed ?? 'any'] as const,
  onboardingInvitations: () =>
    [...adminQueryKeys.all, 'onboarding-invitations'] as const,
};

const url = (path: string): string => `/api/admin/${path}`;

/** Refreshes every back-office list and the overview counters. */
export function useInvalidateAdmin() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.all });
}

export function useAdminOverviewQuery() {
  return useQuery({
    queryKey: adminQueryKeys.overview(),
    queryFn: () => $fetch<AdminOverview>(url('overview')),
  });
}

export function useAdminChartsQuery(range: MaybeRefOrGetter<AdminChartRange>) {
  return useQuery({
    queryKey: computed(() => adminQueryKeys.charts(toValue(range))),
    queryFn: () =>
      $fetch<AdminCharts>(url('overview/charts'), {
        query: { range: toValue(range) },
      }),
    placeholderData: keepPreviousData,
  });
}

export function useAdminRevenueQuery(
  range: MaybeRefOrGetter<AdminRevenueRange>
) {
  return useQuery({
    queryKey: computed(() => adminQueryKeys.revenue(toValue(range))),
    queryFn: () =>
      $fetch<AdminRevenue>(url('overview/revenue'), {
        query: { range: toValue(range) },
      }),
    placeholderData: keepPreviousData,
  });
}

export function useAdminSearchQuery(term: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => adminQueryKeys.search(toValue(term))),
    queryFn: () =>
      $fetch<BackOfficeSearchResult>(url('search'), {
        query: { q: toValue(term) },
      }),
    enabled: () => toValue(term).trim().length >= 2,
  });
}

export function useAdminFeedbackQuery(
  kind: MaybeRefOrGetter<FeedbackKind | 'all'>
) {
  return useQuery({
    queryKey: computed(() => adminQueryKeys.feedback(toValue(kind))),
    queryFn: () => {
      const value = toValue(kind);
      return $fetch<Collection<FeedbackForReview>>(url('feedback'), {
        query: value === 'all' ? {} : { kind: value },
      });
    },
    select: (collection) => collection.items,
  });
}

export function useAdminOrganizationsQuery() {
  return useQuery({
    queryKey: adminQueryKeys.organizations(),
    queryFn: () =>
      $fetch<Collection<AdminOrganizationSummary>>(url('organizations')),
    select: (collection) => collection.items,
  });
}

export function useAdminCardImagesQuery(name: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => adminQueryKeys.cardImages(toValue(name).trim())),
    queryFn: () =>
      $fetch<Collection<CardImage>>(url('card-images'), {
        query: { name: toValue(name).trim() },
      }),
    select: (collection) => collection.items,
    enabled: () => toValue(name).trim().length > 0,
  });
}

export function useAdminUploadsQuery(enabled: MaybeRefOrGetter<boolean>) {
  return useQuery({
    queryKey: adminQueryKeys.uploads(),
    queryFn: () => $fetch<Collection<StoredUpload>>(url('uploads')),
    select: (collection) => collection.items,
    enabled: () => toValue(enabled),
  });
}

export function useAdminBrandAssetsQuery(
  organizationId: MaybeRefOrGetter<string>
) {
  return useQuery({
    queryKey: computed(() =>
      adminQueryKeys.brandAssets(toValue(organizationId))
    ),
    queryFn: () =>
      $fetch<Collection<BrandAsset>>(
        url(`organizations/${toValue(organizationId)}/brand-assets`)
      ),
    select: (collection) => collection.items,
    enabled: () => !!toValue(organizationId),
  });
}

export function useAdminUsersQuery() {
  return useQuery({
    queryKey: adminQueryKeys.users(),
    queryFn: () => $fetch<Collection<AdminUserSummary>>(url('users')),
    select: (collection) => collection.items,
  });
}

export function useAdminActivityQuery(
  filter: MaybeRefOrGetter<AdminActivityQuery>
) {
  return useQuery({
    queryKey: computed(() => adminQueryKeys.activity(toValue(filter))),
    queryFn: () =>
      $fetch<Collection<AdminPersonActivity>>(url('user-activity'), {
        query: toValue(filter),
      }),
    select: (collection) => collection.items,
    placeholderData: keepPreviousData,
  });
}

export function downloadAdminActivityCsv(filter: AdminActivityQuery) {
  return $fetch<Blob>(url('user-activity'), {
    query: filter,
    headers: { Accept: 'text/csv' },
    responseType: 'blob',
  });
}

export function usePersonEventActivityQuery(
  userId: MaybeRefOrGetter<string | null>
) {
  return useQuery({
    queryKey: computed(() =>
      adminQueryKeys.personEventActivity(toValue(userId) ?? '')
    ),
    queryFn: () =>
      $fetch<Collection<AdminPersonEventActivity>>(
        url(`users/${toValue(userId)}/event-activity`)
      ),
    select: (collection) => collection.items,
    enabled: () => Boolean(toValue(userId)),
  });
}

export function useAdminEventsQuery() {
  return useQuery({
    queryKey: adminQueryKeys.events(),
    queryFn: () => $fetch<Collection<AdminEventOption>>(url('events')),
    select: (collection) => collection.items,
  });
}

export function useAdminCardsQuery(filter: { claimed?: boolean } = {}) {
  return useQuery({
    queryKey: adminQueryKeys.cards(filter.claimed),
    queryFn: () =>
      $fetch<Collection<AdminCardSummary>>(url('cards'), {
        query:
          filter.claimed === undefined
            ? {}
            : { claimed: String(filter.claimed) },
      }),
    select: (collection) => collection.items,
  });
}

export function useOnboardingInvitationsQuery() {
  return useQuery({
    queryKey: adminQueryKeys.onboardingInvitations(),
    queryFn: () =>
      $fetch<Collection<OnboardingInvitationSummary>>(
        url('onboarding-invitations')
      ),
    select: (collection) => collection.items,
  });
}

/** Imperative back-office calls; callers refresh with `useInvalidateAdmin`. */
export const adminApi = {
  deleteFeedback: (feedbackId: string) =>
    $fetch<void>(url(`feedback/${feedbackId}`), { method: 'DELETE' }),

  getOrganization: (organizationId: string) =>
    $fetch<AdminOrganizationDetail>(url(`organizations/${organizationId}`)),
  createOrganization: (request: CreateOrganizationRequest) =>
    $fetch<AdminOrganizationSummary>(url('organizations'), {
      method: 'POST',
      body: request,
    }),
  updateOrganization: (
    organizationId: string,
    changes: UpdateOrganizationRequest
  ) =>
    $fetch<{ id: string; slug: string; cardsUpdated: number }>(
      url(`organizations/${organizationId}`),
      { method: 'PATCH', body: changes }
    ),
  deleteOrganization: (organizationId: string) =>
    $fetch<void>(url(`organizations/${organizationId}`), { method: 'DELETE' }),
  createMemberCard: (organizationId: string, userId: string) =>
    $fetch<{ id: string; slug: string }>(
      url(`organizations/${organizationId}/cards`),
      { method: 'POST', body: { userId } }
    ),
  createBrandAssetUpload: (
    organizationId: string,
    request: CreateBrandAssetUploadRequest
  ) =>
    $fetch<UploadTicket>(url(`organizations/${organizationId}/brand-assets`), {
      method: 'POST',
      body: request,
    }),
  applyBrandAsset: (organizationId: string, kind: BrandAssetKind) =>
    $fetch<BrandAsset>(
      url(`organizations/${organizationId}/brand-assets/${kind}`),
      { method: 'PUT' }
    ),
  deleteBrandAsset: (organizationId: string, kind: BrandAssetKind) =>
    $fetch<void>(url(`organizations/${organizationId}/brand-assets/${kind}`), {
      method: 'DELETE',
    }),
  createCardImageUpload: (request: CreateCardImageUploadRequest) =>
    $fetch<UploadTicket>(url('card-images'), { method: 'POST', body: request }),
  deleteCardImage: (kind: CardImageKind, name: string) =>
    $fetch<void>(url(`card-images/${kind}`), {
      method: 'DELETE',
      query: { name },
    }),
  inviteOrganizer: (
    organizationId: string,
    request: CreateOrganizerInvitationRequest
  ) =>
    $fetch<{ id: string; email: string }>(
      url(`organizations/${organizationId}/invitations`),
      { method: 'POST', body: request }
    ),

  getUser: (userId: string) => $fetch<AdminUserDetail>(url(`users/${userId}`)),
  createUser: (request: CreateUserRequest) =>
    $fetch<{ id: string }>(url('users'), { method: 'POST', body: request }),
  updateUser: (userId: string, changes: UpdateUserRequest) =>
    $fetch<{ id: string; changed: string[] }>(url(`users/${userId}`), {
      method: 'PATCH',
      body: changes,
    }),
  deleteUser: (userId: string) =>
    $fetch<void>(url(`users/${userId}`), { method: 'DELETE' }),

  getCard: (cardId: string) => $fetch<AdminCardDetail>(url(`cards/${cardId}`)),
  listCardPeriods: (cardId: string) =>
    $fetch<Collection<CardPeriod>>(url(`cards/${cardId}/periods`)),
  addCardPeriod: (cardId: string, request: AddCardPeriodRequest) =>
    $fetch<{ id: string }>(url(`cards/${cardId}/periods`), {
      method: 'POST',
      body: request,
    }),
  listUserPeriods: (userId: string) =>
    $fetch<Collection<CardPeriod>>(url(`users/${userId}/periods`)),
  updatePaymentItem: (itemId: string, request: UpdatePaymentItemRequest) =>
    $fetch(url(`payment-items/${itemId}`), { method: 'PATCH', body: request }),
  createCard: (request: CreateAdminCardRequest) =>
    $fetch<AdminCardDetail>(url('cards'), { method: 'POST', body: request }),
  updateCard: (cardId: string, changes: UpdateAdminCardRequest) =>
    $fetch<AdminCardDetail>(url(`cards/${cardId}`), {
      method: 'PATCH',
      body: changes,
    }),
  deleteCard: (cardId: string, options: { withUser: boolean }) =>
    $fetch<void>(url(`cards/${cardId}`), {
      method: 'DELETE',
      query: options.withUser ? { withUser: 'true' } : undefined,
    }),

  createOnboardingInvitation: (request: CreateOnboardingInvitationRequest) =>
    $fetch<OnboardingInvitationSummary>(url('onboarding-invitations'), {
      method: 'POST',
      body: request,
    }),
  sendOnboardingInvitation: (invitationId: string) =>
    $fetch<OnboardingInvitationSummary>(
      url(`onboarding-invitations/${invitationId}/deliveries`),
      {
        method: 'POST',
      }
    ),
  cancelOnboardingInvitation: (invitationId: string) =>
    $fetch<{ id: string }>(url(`onboarding-invitations/${invitationId}`), {
      method: 'PATCH',
      body: { status: 'canceled' },
    }),
};
