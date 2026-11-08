import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import type {
  AddToGoogleCalendarResult,
  AttendeeLabelSummary,
  CreateAttendeeLabelRequest,
  EventAttendeeCollection,
  EventBroadcastKind,
  EventCollection,
  EventDetailDTO,
  EventMembershipResult,
  TicketLookup,
  UpdateAttendeeLabelRequest,
} from '~~/shared/contracts/event';
import type { Collection } from '~~/shared/contracts/collection';
import type { Label } from '~~/shared/contracts/label';
import type { ContactEvent } from '~~/shared/contracts/contact';
import { timezoneOffsetQuery } from '~~/shared/utils/datetime';
import { organizationQueryKeys } from '~/features/organization/composables/use-user-organizations';

export const eventQueryKeys = {
  all: ['events'] as const,
  list: (organizationSlug: string) =>
    [...eventQueryKeys.all, 'list', organizationSlug] as const,
  detail: (eventId: string) =>
    [...eventQueryKeys.all, 'detail', eventId] as const,
  attendees: (eventId: string) =>
    [...eventQueryKeys.all, 'attendees', eventId] as const,
  registered: () => [...eventQueryKeys.all, 'registered'] as const,
  attendeeLabels: (organizationSlug: string) =>
    [...eventQueryKeys.all, 'attendee-labels', organizationSlug] as const,
};

const eventUrl = (eventId: string, path = ''): string =>
  `/api/events/${eventId}${path ? `/${path}` : ''}`;

/** Events the signed-in user registered for. */
export function useRegisteredEventsQuery(
  options: { enabled?: MaybeRefOrGetter<boolean> } = {}
) {
  return useQuery({
    queryKey: eventQueryKeys.registered(),
    queryFn: () => $fetch<Collection<ContactEvent>>('/api/me/events'),
    enabled: () => toValue(options.enabled ?? true),
  });
}

export function useOrganizationEventsQuery(
  organizationSlug: MaybeRefOrGetter<string>
) {
  return useQuery({
    queryKey: computed(() => eventQueryKeys.list(toValue(organizationSlug))),
    queryFn: () =>
      $fetch<EventCollection>(
        `/api/organizations/${toValue(organizationSlug)}/events` as string
      ),
    enabled: () => !!toValue(organizationSlug),
  });
}

export function useEventQuery(eventId: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => eventQueryKeys.detail(toValue(eventId))),
    queryFn: () =>
      $fetch<EventDetailDTO>(eventUrl(toValue(eventId)), {
        query: timezoneOffsetQuery(),
      }),
    enabled: () => !!toValue(eventId),
  });
}

export function useEventAttendeesQuery(
  eventId: MaybeRefOrGetter<string>,
  options: { enabled?: MaybeRefOrGetter<boolean> } = {}
) {
  return useQuery({
    queryKey: computed(() => eventQueryKeys.attendees(toValue(eventId))),
    queryFn: () =>
      $fetch<EventAttendeeCollection>(
        eventUrl(toValue(eventId), 'registrations')
      ),
    select: (collection) => collection.items,
    enabled: () => !!toValue(eventId) && toValue(options.enabled ?? true),
  });
}

function useInvalidateEvents() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: eventQueryKeys.all });
}

/** The signed-in member registers for an event (idempotent). */
export function registerForEvent(eventId: string) {
  return $fetch<{ id: string; status: string }>(
    eventUrl(eventId, 'registrations'),
    {
      method: 'POST',
    }
  );
}

export function useRegisterForEventMutation() {
  const invalidateEvents = useInvalidateEvents();
  return useMutation({
    mutationFn: registerForEvent,
    onSuccess: invalidateEvents,
  });
}

export function useApproveRegistrationMutation() {
  const invalidateEvents = useInvalidateEvents();
  return useMutation({
    mutationFn: (registrationId: string) =>
      $fetch<{ id: string; status: string }>(
        `/api/registrations/${registrationId}` as string,
        { method: 'PATCH', body: { status: 'registered' } }
      ),
    onSuccess: invalidateEvents,
  });
}

/** The community's attendee labels (organizers manage them, volunteers read them). */
export function useAttendeeLabelsQuery(
  organizationSlug: MaybeRefOrGetter<string>
) {
  return useQuery({
    queryKey: computed(() =>
      eventQueryKeys.attendeeLabels(toValue(organizationSlug))
    ),
    queryFn: () =>
      $fetch<Collection<AttendeeLabelSummary>>(
        `/api/organizations/${toValue(organizationSlug)}/attendee-labels` as string
      ),
    select: (collection) => collection.items,
    enabled: () => !!toValue(organizationSlug),
  });
}

// Label changes show up on attendee rows, so every event query refetches.
export function useCreateAttendeeLabelMutation(
  organizationSlug: MaybeRefOrGetter<string>
) {
  const invalidateEvents = useInvalidateEvents();
  return useMutation({
    mutationFn: (input: CreateAttendeeLabelRequest) =>
      $fetch<AttendeeLabelSummary>(
        `/api/organizations/${toValue(organizationSlug)}/attendee-labels` as string,
        { method: 'POST', body: input }
      ),
    onSuccess: invalidateEvents,
  });
}

export function useUpdateAttendeeLabelMutation() {
  const invalidateEvents = useInvalidateEvents();
  return useMutation({
    mutationFn: ({
      labelId,
      input,
    }: {
      labelId: string;
      input: UpdateAttendeeLabelRequest;
    }) =>
      $fetch<Label>(`/api/attendee-labels/${labelId}` as string, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: invalidateEvents,
  });
}

export function useDeleteAttendeeLabelMutation() {
  const invalidateEvents = useInvalidateEvents();
  return useMutation({
    mutationFn: (labelId: string) =>
      $fetch<void>(`/api/attendee-labels/${labelId}` as string, {
        method: 'DELETE',
      }),
    onSuccess: invalidateEvents,
  });
}

export function useReplaceRegistrationLabelsMutation() {
  const invalidateEvents = useInvalidateEvents();
  return useMutation({
    mutationFn: ({
      registrationId,
      labelIds,
    }: {
      registrationId: string;
      labelIds: string[];
    }) =>
      $fetch<Collection<Label>>(
        `/api/registrations/${registrationId}/labels` as string,
        { method: 'PUT', body: { labelIds } }
      ),
    onSuccess: invalidateEvents,
  });
}

export function useDeleteEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) =>
      $fetch<void>(`/api/events/${eventId}` as string, { method: 'DELETE' }),
    // Not awaited, so the caller can leave the detail page before its refetch 404s.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventQueryKeys.all });
    },
  });
}

export function useBroadcastEventEmailMutation(
  eventId: MaybeRefOrGetter<string>
) {
  return useMutation({
    mutationFn: (kind: EventBroadcastKind) =>
      $fetch<{ recipientCount: number; skipped: number }>(
        eventUrl(toValue(eventId), 'broadcasts'),
        { method: 'POST', body: { kind } }
      ),
  });
}

export function lookUpTicket(eventId: string, cardSlug: string) {
  return $fetch<TicketLookup>(
    eventUrl(eventId, `tickets/${encodeURIComponent(cardSlug)}`)
  );
}

export function checkInAttendee(eventId: string, cardSlug: string) {
  return $fetch<{ id: string; status: string }>(
    eventUrl(eventId, 'check-ins'),
    {
      method: 'POST',
      body: { cardSlug },
    }
  );
}

export function addEventToGoogleCalendar(eventId: string) {
  return $fetch<AddToGoogleCalendarResult>(
    eventUrl(eventId, 'calendar-entries'),
    {
      method: 'POST',
    }
  );
}

/** Joins the community that hosts an event (from the public event page). */
export function useJoinEventCommunityMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) =>
      $fetch<EventMembershipResult>(eventUrl(eventId, 'memberships'), {
        method: 'POST',
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: organizationQueryKeys.all }),
  });
}
