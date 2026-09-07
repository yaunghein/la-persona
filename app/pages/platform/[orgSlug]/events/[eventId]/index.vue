<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

import { useQuery } from '@tanstack/vue-query';
import type {
  CommunityEventDetailData,
  CommunityEventDetailTab,
  EventAttendee,
} from '~~/shared/types/community-event-detail';
import type { EventDTO } from '~~/shared/types/event';
import {
  eventStatus,
  formatEventDateTimeRange,
  formatEventDateValue,
} from '~~/shared/utils/event-datetime';

const toast = useToast();
const route = useRoute();
const { organizationSlug, withOrganizationQuery } = useOrganizationSlug();
const eventId = computed(() => String(route.params.eventId || ''));

const activeTab = ref<CommunityEventDetailTab>('overview');
const isProfileOpen = ref(false);
const isScannerOpen = ref(false);
const isEditOpen = ref(false);
const selectedAttendee = ref<EventAttendee | null>(null);

const mockAttendees: EventAttendee[] = [
  {
    id: 'a1',
    name: 'Aye Min Thura',
    role: 'Founder',
    company: 'Wave Ventures',
    status: 'checked_in',
    statusLabel: 'Checked-in at 6:42 PM',
    membershipStatus: 'Active',
    joinedAt: 'Jan 12, 2026',
    registeredAt: 'Apr 02, 2026',
    checkedInAt: '6:42 PM',
    eventsAttended: 8,
    connectionsMade: 42,
    phone: '+95 9 123 456 789',
    email: 'thura@waveventures.co',
  },
  {
    id: 'a2',
    name: 'May Zin Oo',
    role: 'Strategy Consultant',
    company: 'Deloitte Myanmar',
    status: 'checked_in',
    statusLabel: 'Checked-in at 6:42 PM',
    membershipStatus: 'Active',
    joinedAt: 'Feb 03, 2026',
    registeredAt: 'Apr 10, 2026',
    checkedInAt: '6:42 PM',
    eventsAttended: 2,
    connectionsMade: 8,
    phone: '+95 9 234 567 890',
    email: 'may@deloittemyanmar.com',
  },
  {
    id: 'a3',
    name: 'Ethan Wong',
    role: 'Product Manager',
    company: 'Nexus Labs',
    status: 'registered',
    statusLabel: 'Registered',
    membershipStatus: 'Active',
    joinedAt: 'Dec 20, 2025',
    registeredAt: 'Apr 28, 2026',
    checkedInAt: null,
    eventsAttended: 6,
    connectionsMade: 24,
    phone: '+95 9 345 678 901',
    email: 'ethan@nexuslab.com',
  },
  {
    id: 'a4',
    name: 'Su Su Hlaing',
    role: 'UX Designer',
    company: 'Freelance',
    status: 'checked_in',
    statusLabel: 'Checked-in at 6:18 PM',
    membershipStatus: 'Active',
    joinedAt: 'Jan 08, 2026',
    registeredAt: 'May 01, 2026',
    checkedInAt: '6:18 PM',
    eventsAttended: 3,
    connectionsMade: 11,
    phone: '+95 9 456 789 012',
    email: 'susuhlaing1999@gmail.com',
  },
];

const { data: event, isLoading } = useQuery<EventDTO>({
  queryKey: ['events', organizationSlug, eventId],
  queryFn: () =>
    $fetch(`/api/events/${eventId.value}`, {
      query: withOrganizationQuery(),
    }),
  enabled: () => !!eventId.value && !!organizationSlug.value,
});

const eventDetail = computed<CommunityEventDetailData | null>(() => {
  if (!event.value) return null;

  return {
    id: event.value.id,
    title: event.value.title,
    status: eventStatus(event.value.endsAt),
    overview: {
      dateTime: formatEventDateTimeRange(
        event.value.startsAt,
        event.value.endsAt
      ),
      place: event.value.location,
      registrationStatus: 'open',
      registrations: 0,
      checkedIn: 0,
      attendanceRate: '—',
      newMembersJoined: 0,
      registrationTrend: {
        labels: ['—'],
        values: [0],
      },
    },
    attendees: mockAttendees,
    settings: {
      title: event.value.title,
      date: formatEventDateValue(event.value.startsAt),
      location: event.value.location,
      registration: 'open',
      approval: 'everyone',
    },
  };
});

const walkInUrl = computed(() => {
  if (!import.meta.client) return '';
  return `${window.location.origin}/platform/${organizationSlug.value}/events/${eventId.value}/walkin`;
});

function goBack() {
  navigateTo(`/platform/${organizationSlug.value}/events`);
}

function onSelectAttendee(attendee: EventAttendee) {
  selectedAttendee.value = attendee;
  isProfileOpen.value = true;
}

function onOpenScanner() {
  isScannerOpen.value = true;
}

function onEdit() {
  isEditOpen.value = true;
}

async function onShare() {
  if (!eventDetail.value) return;

  const shareUrl = `${window.location.origin}/platform/${organizationSlug.value}/events/${eventId.value}`;
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
</script>

<template>
  <div
    v-if="isLoading"
    class="flex min-h-[calc(100dvh-11rem)] flex-col gap-6 py-2"
  >
    <USkeleton class="h-8 w-80 rounded-md" />
    <USkeleton class="h-10 w-72 rounded-md" />
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <USkeleton v-for="index in 4" :key="index" class="h-27 rounded-lg" />
    </div>
  </div>

  <div
    v-else-if="!eventDetail"
    class="flex min-h-[calc(100dvh-11rem)] flex-col items-center justify-center gap-6 py-20"
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
      @select="onSelectAttendee"
    />

    <CommunityEventCheckIn
      v-else-if="activeTab === 'check-in'"
      :attendees="eventDetail.attendees"
      @open-scanner="onOpenScanner"
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
    :attendees="eventDetail.attendees"
    :walk-in-url="walkInUrl"
  />

  <CommunityCreateEventSlideover
    v-if="event"
    v-model:open="isEditOpen"
    :event="event"
    @deleted="goBack"
  />
</template>
