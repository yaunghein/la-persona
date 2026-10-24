import { useQuery, type QueryClient } from '@tanstack/vue-query';
import type { Collection } from '~~/shared/contracts/collection';
import type { UserOrganization } from '~~/shared/contracts/organization';

export const organizationQueryKeys = {
  all: ['organizations'] as const,
  mine: () => [...organizationQueryKeys.all, 'mine'] as const,
  members: (organizationSlug: string) =>
    [...organizationQueryKeys.all, 'members', organizationSlug] as const,
  joinLink: (organizationSlug: string) =>
    [...organizationQueryKeys.all, 'join-link', organizationSlug] as const,
  detail: (organizationSlug: string) =>
    [...organizationQueryKeys.all, 'detail', organizationSlug] as const,
  invitation: (invitationId: string) =>
    [...organizationQueryKeys.all, 'invitation', invitationId] as const,
  joinLinkPreview: (token: string) =>
    [...organizationQueryKeys.all, 'join-link-preview', token] as const,
};

/** Organizations the signed-in user belongs to (with their role in each). */
export function useUserOrganizations() {
  return useQuery({
    queryKey: organizationQueryKeys.mine(),
    queryFn: () =>
      $fetch<Collection<UserOrganization>>('/api/me/organizations'),
    select: (collection) => collection.items,
  });
}

/**
 * For route middleware (no component context): returns the cached list or
 * fetches it once through the shared query client.
 */
export async function loadUserOrganizations(): Promise<UserOrganization[]> {
  const queryClient = useNuxtApp().$queryClient as QueryClient;
  const collection = await queryClient.fetchQuery({
    queryKey: organizationQueryKeys.mine(),
    queryFn: () =>
      $fetch<Collection<UserOrganization>>('/api/me/organizations'),
  });
  return collection.items;
}
