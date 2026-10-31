import { useQuery, useQueryClient } from '@tanstack/vue-query';
import type {
  AdminUserDetail,
  AdminUserSummary,
  CreateUserRequest,
  UpdateUserRequest,
} from '~~/shared/contracts/account';
import type {
  AdminOverview,
  BackOfficeSearchResult,
} from '~~/shared/contracts/admin';
import type {
  AdminCardDetail,
  AdminCardSummary,
  CreateAdminCardRequest,
  UpdateAdminCardRequest,
} from '~~/shared/contracts/card';
import type { Collection } from '~~/shared/contracts/collection';
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
  search: (term: string) => [...adminQueryKeys.all, 'search', term] as const,
  feedback: (kind: FeedbackKind | 'all') =>
    [...adminQueryKeys.all, 'feedback', kind] as const,
  organizations: () => [...adminQueryKeys.all, 'organizations'] as const,
  users: () => [...adminQueryKeys.all, 'users'] as const,
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

export function useAdminUsersQuery() {
  return useQuery({
    queryKey: adminQueryKeys.users(),
    queryFn: () => $fetch<Collection<AdminUserSummary>>(url('users')),
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
  createCard: (request: CreateAdminCardRequest) =>
    $fetch<AdminCardDetail>(url('cards'), { method: 'POST', body: request }),
  updateCard: (cardId: string, changes: UpdateAdminCardRequest) =>
    $fetch<AdminCardDetail>(url(`cards/${cardId}`), {
      method: 'PATCH',
      body: changes,
    }),
  deleteCard: (cardId: string) =>
    $fetch<void>(url(`cards/${cardId}`), { method: 'DELETE' }),

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
