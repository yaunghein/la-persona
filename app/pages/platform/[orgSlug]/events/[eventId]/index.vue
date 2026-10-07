<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { QUERY_KEYS } from '~/utils/query-keys';
import type {
  CommunityEventDetailData,
  CommunityEventDetailTab,
  EventAttendee,
} from '~~/shared/types/community-event-detail';
import type { EventDetailDTO } from '~~/shared/types/event';
import { publicEventAbsoluteUrl } from '~~/shared/utils/routes';
import {
  eventPhase,
  formatEventDateTimeRange,
  formatEventDateValue,
  registrationBlockReason,
} from '~~/shared/utils/event-datetime';

const toast = useToast();
const queryClient = useQueryClient();
const route = useRoute();
const { organizationSlug, withOrganizationQuery } = useOrganizationSlug();
const eventId = computed(() => String(route.params.eventId || ''));

const activeTab = ref<CommunityEventDetailTab>('overview');
const isProfileOpen = ref(false);
const isScannerOpen = ref(false);
const isWalkInOpen = ref(false);
const isEditOpen = ref(false);
const selectedAttendee = ref<EventAttendee | null>(null);

const { data: event, isLoading } = useQuery<EventDetailDTO>({
  queryKey: computed(() => [
    ...QUERY_KEYS.event,
    organizationSlug.value,
    eventId.value,
  ]),
  queryFn: () =>
    $fetch(`/api/events/${eventId.value}`, {
      query: withOrganizationQuery(),
    }),
  enabled: () => !!eventId.value && !!organizationSlug.value,
});

const { data: attendeesData, refetch: refetchAttendees } = useQuery<{
  attendees: EventAttendee[];
}>({
  queryKey: computed(() => [
    ...QUERY_KEYS.eventAttendees,
    organizationSlug.value,
    eventId.value,
  ]),
  queryFn: () =>
    $fetch(`/api/events/${eventId.value}/attendees`, {
      query: withOrganizationQuery(),
    }),
  enabled: () => !!eventId.value && !!organizationSlug.value,
});

const { mutate: approveAttendee } = useMutation({
  mutationFn: (attendee: EventAttendee) =>
    $fetch(`/api/events/${eventId.value}/attendees/${attendee.id}/approve`, {
      method: 'POST',
      query: withOrganizationQuery(),
    }),
  onSuccess: async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.event, organizationSlug.value, eventId.value],
      }),
      refetchAttendees(),
    ]);
    toast.add({ title: 'Registration approved', color: 'success' });
  },
  onError: (error: { data?: { statusMessage?: string }; message?: string }) => {
    toast.add({
      title: 'Could not approve',
      description:
        error.data?.statusMessage || error.message || 'Please try again.',
      color: 'error',
    });
  },
});

const eventDetail = computed<CommunityEventDetailData | null>(() => {
  if (!event.value) return null;

  return {
    id: event.value.id,
    title: event.value.title,
    status:
      eventPhase(event.value.startsAt, event.value.endsAt) === 'past'
        ? 'past'
        : 'upcoming',
    overview: {
      dateTime: formatEventDateTimeRange(
        event.value.startsAt,
        event.value.endsAt
      ),
      place: event.value.location,
      registrationStatus: event.value.registrationMode,
      registrations: event.value.overview.registrations,
      checkedIn: event.value.overview.checkedIn,
      attendanceRate: event.value.overview.attendanceRate,
      newMembersJoined: event.value.overview.newMembersJoined,
      registrationTrend: event.value.overview.registrationTrend,
    },
    attendees: attendeesData.value?.attendees ?? [],
    settings: {
      title: event.value.title,
      date: formatEventDateValue(event.value.startsAt),
      location: event.value.location,
      registration: event.value.registrationMode,
      approval: event.value.approvalMode,
    },
  };
});

const phase = computed(() =>
  event.value ? eventPhase(event.value.startsAt, event.value.endsAt) : 'before'
);

const canWalkIn = computed(() => {
  if (!event.value) return false;
  return (
    registrationBlockReason({
      startsAt: event.value.startsAt,
      endsAt: event.value.endsAt,
      registrationMode: event.value.registrationMode,
      capacity: event.value.capacity,
      registeredCount: event.value.registeredCount,
    }) === null
  );
});

const walkInUrl = computed(() => publicEventAbsoluteUrl(eventId.value));

function goBack() {
  navigateTo(`/platform/${organizationSlug.value}/events`);
}

function onSelectAttendee(attendee: EventAttendee) {
  selectedAttendee.value = attendee;
  isProfileOpen.value = true;
}

function onOpenScanner() {
  if (phase.value !== 'live') return;
  isScannerOpen.value = true;
}

function onOpenWalkIn() {
  if (!canWalkIn.value) return;
  isWalkInOpen.value = true;
}

function onEdit() {
  isEditOpen.value = true;
}

async function onShare() {
  if (!eventDetail.value) return;

  const shareUrl = publicEventAbsoluteUrl(eventId.value);
  try {
    await navigator.clipboard.writeText(shareUrl);
    toast.add({
      title: 'Link copied',
      description: `Share link for “${eventDetail.value.title}” copied.`,
      color: 'success',
    });
  } catch {
    toast.add({
      title: 'Copy failed',
      description: 'Could not copy event link.',
      color: 'error',
    });
  }
}

async function onCheckedIn() {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: [...QUERY_KEYS.event, organizationSlug.value, eventId.value],
    }),
    refetchAttendees(),
  ]);
}
</script>

<template>
  <div v-if="isLoading" class="flex flex-col gap-6 py-2">
    <USkeleton class="h-8 w-80 rounded-md" />
    <USkeleton class="h-10 w-72 rounded-md" />
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <USkeleton v-for="index in 4" :key="index" class="h-27 rounded-lg" />
    </div>
  </div>

  <div
    v-else-if="!eventDetail"
    class="flex flex-col items-center justify-center gap-6 py-20"
  >
    <p class="text-sm text-[#8b8b8b]">Event not found.</p>
    <UButton
      label="Back to Events"
      leading-icon="i-lucide-chevron-left"
      color="neutral"
      class="h-9 cursor-pointer rounded-full bg-[#232323] py-2 pr-6 pl-5 text-sm font-medium text-white hover:bg-[#2a2a2a]"
      @click="goBack"
    />
  </div>

  <CommunityEventDetailShell
    v-else
    :title="eventDetail.title"
    :status="eventDetail.status"
    :active-tab="activeTab"
    @back="goBack"
    @edit="onEdit"
    @share="onShare"
    @update:active-tab="activeTab = $event"
  >
    <CommunityEventOverview
      v-if="activeTab === 'overview'"
      :data="eventDetail.overview"
    />

    <CommunityEventAttendees
      v-else-if="activeTab === 'attendees'"
      :attendees="eventDetail.attendees"
      :allow-approve="phase !== 'past'"
      @select="onSelectAttendee"
      @approve="approveAttendee"
    />

    <CommunityEventCheckIn
      v-else-if="activeTab === 'check-in'"
      :attendees="eventDetail.attendees"
      :check-in-phase="phase"
      :can-walk-in="canWalkIn"
      @open-scanner="onOpenScanner"
      @open-walk-in="onOpenWalkIn"
      @select="onSelectAttendee"
    />
  </CommunityEventDetailShell>

  <CommunityEventAttendeeProfileSlideover
    :key="selectedAttendee?.id ?? 'attendee-profile'"
    v-model:open="isProfileOpen"
    :attendee="selectedAttendee"
  />

  <CommunityEventCheckInScanner
    v-if="eventDetail"
    v-model:open="isScannerOpen"
    :event-id="eventId"
    :attendees="eventDetail.attendees"
    @checked-in="onCheckedIn"
  />

  <CommunityEventWalkInRegistrationSlideover
    v-model:open="isWalkInOpen"
    :walk-in-url="walkInUrl"
  />

  <CommunityCreateEventSlideover
    v-if="event"
    v-model:open="isEditOpen"
    :event="event"
    @deleted="goBack"
    @updated="
      () =>
        queryClient.invalidateQueries({
          queryKey: [...QUERY_KEYS.event, organizationSlug, eventId],
        })
    "
  />
</template>
