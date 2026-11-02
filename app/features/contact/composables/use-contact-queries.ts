import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/vue-query';
import type { Collection, Page } from '~~/shared/contracts/collection';
import type {
  ContactEvent,
  ContactSummary,
  CreateManualContactRequest,
  UpdateContactRequest,
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
  eventId?: string;
};

export const contactQueryKeys = {
  all: ['contacts'] as const,
  list: (params: ContactListParams) =>
    [...contactQueryKeys.all, 'list', params] as const,
  events: (scope: ContactListScope) =>
    [...contactQueryKeys.all, 'events', scope] as const,
};

function contactsUrl(scope: ContactListScope) {
  return 'workspace' in scope
    ? '/api/me/contacts'
    : `/api/organizations/${scope.organizationSlug}/contacts`;
}

/** Events that appear on contacts in scope, for the "where you met" filter. */
export function useContactEventsQuery(
  scope: MaybeRefOrGetter<ContactListScope>,
  options: { enabled?: MaybeRefOrGetter<boolean> } = {}
) {
  return useQuery({
    queryKey: computed(() => contactQueryKeys.events(toValue(scope))),
    queryFn: () => {
      const value = toValue(scope);
      const url =
        'workspace' in value
          ? '/api/me/contact-events'
          : (`/api/organizations/${value.organizationSlug}/contact-events` as string);
      return $fetch<Collection<ContactEvent>>(url);
    },
    enabled: () => toValue(options.enabled ?? true),
  });
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

export function useUpdateContactMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      contactId,
      input,
    }: {
      contactId: string;
      input: UpdateContactRequest;
    }) =>
      $fetch<ContactSummary>(`/api/contacts/${contactId}` as string, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: contactQueryKeys.all }),
  });
}

export function useDeleteContactMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contactId: string) =>
      $fetch<void>(`/api/contacts/${contactId}` as string, {
        method: 'DELETE',
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: contactQueryKeys.all }),
  });
}

/** Every contact in scope as CSV (server-generated, formula-safe). */
export function downloadContactsCsv(
  scope: ContactListScope,
  query: { eventId?: string } = {}
): Promise<Blob> {
  return $fetch<Blob>(contactsUrl(scope), {
    query,
    headers: { Accept: 'text/csv' },
    responseType: 'blob',
  });
}
