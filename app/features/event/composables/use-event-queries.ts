import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import type {
  AddToGoogleCalendarResult,
  CreateEventRequest,
  EventAttendeeCollection,
  EventBroadcastKind,
  EventCollection,
  EventDetailDTO,
  EventDTO,
  EventMembershipResult,
  TicketLookup,
  UpdateEventRequest,
} from '~~/shared/contracts/event';
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
};

const eventUrl = (eventId: string, path = ''): string =>
  `/api/events/${eventId}${path ? `/${path}` : ''}`;

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

export function useCreateEventMutation(
  organizationSlug: MaybeRefOrGetter<string>
) {
  const invalidateEvents = useInvalidateEvents();
  return useMutation({
    mutationFn: (request: CreateEventRequest) =>
      $fetch<EventDTO>(
        `/api/organizations/${toValue(organizationSlug)}/events` as string,
        {
          method: 'POST',
          body: request,
        }
      ),
    onSuccess: invalidateEvents,
  });
}

export function useUpdateEventMutation() {
  const invalidateEvents = useInvalidateEvents();
  return useMutation({
    mutationFn: ({
      eventId,
      request,
    }: {
      eventId: string;
      request: UpdateEventRequest;
    }) =>
      $fetch<EventDTO>(eventUrl(eventId), { method: 'PATCH', body: request }),
    onSuccess: invalidateEvents,
  });
}

export function useDeleteEventMutation() {
  const invalidateEvents = useInvalidateEvents();
  return useMutation({
    mutationFn: (eventId: string) =>
      $fetch<void>(eventUrl(eventId), { method: 'DELETE' }),
    onSuccess: invalidateEvents,
  });
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
