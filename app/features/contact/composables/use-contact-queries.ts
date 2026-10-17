import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/vue-query';
import type { Page } from '~~/shared/contracts/collection';
import type {
  ContactSummary,
  CreateManualContactRequest,
} from '~~/shared/contracts/contact';

/** Whose contacts: one organization, or every card the user holds (`workspace`). */
export type ContactListScope =
  | { organizationSlug: string }
  | { workspace: true };

export type ContactListParams = {
  scope: ContactListScope;
  limit: number;
  offset: number;
  q?: string;
};

export const contactQueryKeys = {
  all: ['contacts'] as const,
  list: (params: ContactListParams) =>
    [...contactQueryKeys.all, 'list', params] as const,
};

function contactsUrl(scope: ContactListScope) {
  return 'workspace' in scope
    ? '/api/me/contacts'
    : `/api/organizations/${scope.organizationSlug}/contacts`;
}

export function useContactsQuery(
  params: MaybeRefOrGetter<ContactListParams>,
  options: { enabled?: MaybeRefOrGetter<boolean> } = {}
) {
  return useQuery({
    queryKey: computed(() => contactQueryKeys.list(toValue(params))),
    queryFn: () => {
      const { scope, ...query } = toValue(params);
      return $fetch<Page<ContactSummary>>(contactsUrl(scope), { query });
    },
    placeholderData: keepPreviousData,
    enabled: () => toValue(options.enabled ?? true),
  });
}

export function useCreateManualContactMutation(
  organizationSlug: MaybeRefOrGetter<string>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateManualContactRequest) =>
      $fetch<{ id: string }>(
        `/api/organizations/${toValue(organizationSlug)}/contacts`,
        { method: 'POST', body: input }
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: contactQueryKeys.all }),
  });
}

export function useDeleteContactMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contactId: string) =>
      $fetch(`/api/contacts/${contactId}`, { method: 'DELETE' }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: contactQueryKeys.all }),
  });
}

/** Every contact in scope as CSV (server-generated, formula-safe). */
export function downloadContactsCsv(scope: ContactListScope): Promise<Blob> {
  return $fetch<Blob>(contactsUrl(scope), {
    headers: { Accept: 'text/csv' },
    responseType: 'blob',
  });
}
