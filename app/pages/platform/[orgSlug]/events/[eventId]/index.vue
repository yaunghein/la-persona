<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

import type {
  CommunityEventDetailData,
  CommunityEventDetailTab,
  EventAttendee,
  EventDetailSettings,
} from '~~/shared/types/community-event-detail';

const toast = useToast();
const route = useRoute();
const orgSlug = computed(() => String(route.params.orgSlug || ''));
const eventId = computed(() => String(route.params.eventId || ''));

const activeTab = ref<CommunityEventDetailTab>('overview');
const isProfileOpen = ref(false);
const isScannerOpen = ref(false);
const selectedAttendee = ref<EventAttendee | null>(null);
const settingsDraft = ref<EventDetailSettings | null>(null);

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
    email: 'aye@waveventures.com',
  },
  {
    id: 'a2',
    name: 'May Zin Oo',
    role: 'Strategy Consultant',
    company: 'Deloitte Myanmar',
    status: 'registered',
    statusLabel: 'Registered',
    membershipStatus: 'Active',
    joinedAt: 'Feb 03, 2026',
    registeredAt: 'Apr 10, 2026',
    checkedInAt: null,
    eventsAttended: 2,
    connectionsMade: 8,
    phone: '+95 9 234 567 890',
    email: 'may@deloitte.com',
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
    email: 'ethan@nexuslabs.io',
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
    email: 'susu@design.mm',
  },
  {
    id: 'a5',
    name: 'Aung Pyae Kyaw',
    role: 'Designer',
    company: 'LA PERSONA',
    status: 'checked_in',
    statusLabel: 'Checked-in at 6:42 PM',
    membershipStatus: 'Active',
    joinedAt: 'Nov 01, 2025',
    registeredAt: 'Apr 15, 2026',
    checkedInAt: '6:42 PM',
    eventsAttended: 5,
    connectionsMade: 18,
    phone: '+66 1234 5678',
    email: 'aung@la-persona.com',
  },
  {
    id: 'a6',
    name: 'Hnin Ei Phyu',
    role: 'Investor',
    company: 'Golden Bridge Capital',
    status: 'registered',
    statusLabel: 'Registered',
    membershipStatus: 'Active',
    joinedAt: 'Mar 12, 2026',
    registeredAt: 'May 02, 2026',
    checkedInAt: null,
    eventsAttended: 1,
    connectionsMade: 4,
    phone: '+95 9 567 890 123',
    email: 'hnin@goldenbridge.vc',
  },
];

/** Mock detail data for events 1–6 (matches events list titles). */
const eventDetailsMap: Record<string, CommunityEventDetailData> = {
  '1': {
    id: '1',
    title: 'Tech Leaders Networking Night 2026',
    status: 'upcoming',
    overview: {
      dateTime: 'May 15, 2026\n6:00 PM - 9:30 PM',
      place: 'The Strand Ballroom, Yangon, Myanmar',
      registrationStatus: 'open',
      registrations: 342,
      checkedIn: 218,
      attendanceRate: '64%',
      newMembersJoined: 46,
      registrationTrend: {
        labels: ['Jan 10', 'Jan 11', 'Jan 12', 'Jan 13', 'Jan 14', 'Jan 15', 'Jan 16'],
        values: [20, 45, 70, 95, 120, 150, 160],
      },
    },
    attendees: mockAttendees,
    settings: {
      title: 'Tech Leaders Networking Night 2026',
      date: '2026-05-15',
      location: 'The Strand Ballroom, Yangon',
      registration: 'open',
      approval: 'everyone',
    },
  },
  '2': {
    id: '2',
    title: 'Founders & Investors Dinner',
    status: 'upcoming',
    overview: {
      dateTime: '08 June 2026 · 7:00 PM – 10:00 PM',
      place: 'Rosewood Yangon',
      registrationStatus: 'open',
      registrations: 24,
      checkedIn: 0,
      attendanceRate: '—',
      newMembersJoined: 3,
      registrationTrend: {
        labels: ['May 1', 'May 8', 'May 15', 'May 22', 'May 29', 'Jun 5'],
        values: [2, 5, 9, 14, 18, 24],
      },
    },
    attendees: mockAttendees.slice(0, 6),
    settings: {
      title: 'Founders & Investors Dinner',
      date: '2026-06-08',
      location: 'Rosewood Yangon',
      registration: 'invite_only',
      approval: 'manual',
    },
  },
  '3': {
    id: '3',
    title: 'Startup Mixer Yangon #12',
    status: 'past',
    overview: {
      dateTime: '02 April 2026 · 6:30 PM – 9:00 PM',
      place: 'Impact Hub Yangon',
      registrationStatus: 'closed',
      registrations: 62,
      checkedIn: 54,
      attendanceRate: '87%',
      newMembersJoined: 11,
      registrationTrend: {
        labels: ['Mar 1', 'Mar 8', 'Mar 15', 'Mar 22', 'Mar 29', 'Apr 1'],
        values: [10, 22, 35, 48, 58, 62],
      },
    },
    attendees: mockAttendees,
    settings: {
      title: 'Startup Mixer Yangon #12',
      date: '2026-04-02',
      location: 'Impact Hub Yangon',
      registration: 'open',
      approval: 'everyone',
    },
  },
  '4': {
    id: '4',
    title: 'Product Design Workshop',
    status: 'upcoming',
    overview: {
      dateTime: '22 July 2026 · 2:00 PM – 5:00 PM',
      place: 'Junction City, Yangon',
      registrationStatus: 'open',
      registrations: 36,
      checkedIn: 0,
      attendanceRate: '—',
      newMembersJoined: 4,
      registrationTrend: {
        labels: ['Jun 1', 'Jun 8', 'Jun 15', 'Jun 22', 'Jun 29', 'Jul 6', 'Jul 13'],
        values: [3, 7, 12, 18, 25, 31, 36],
      },
    },
    attendees: mockAttendees.slice(0, 5),
    settings: {
      title: 'Product Design Workshop',
      date: '2026-07-22',
      location: 'Junction City, Yangon',
      registration: 'open',
      approval: 'everyone',
    },
  },
  '5': {
    id: '5',
    title: 'Community AMA: Scaling Teams',
    status: 'past',
    overview: {
      dateTime: '10 March 2026 · 7:00 PM – 8:30 PM',
      place: 'Online',
      registrationStatus: 'closed',
      registrations: 89,
      checkedIn: 72,
      attendanceRate: '81%',
      newMembersJoined: 8,
      registrationTrend: {
        labels: ['Feb 1', 'Feb 8', 'Feb 15', 'Feb 22', 'Mar 1', 'Mar 8'],
        values: [12, 28, 45, 62, 78, 89],
      },
    },
    attendees: mockAttendees,
    settings: {
      title: 'Community AMA: Scaling Teams',
      date: '2026-03-10',
      location: 'Online',
      registration: 'open',
      approval: 'everyone',
    },
  },
  '6': {
    id: '6',
    title: 'Yangon Tech Summit Preview',
    status: 'upcoming',
    overview: {
      dateTime: '30 August 2026 · 5:00 PM – 8:00 PM',
      place: 'Sedona Hotel Yangon',
      registrationStatus: 'closed',
      registrations: 120,
      checkedIn: 0,
      attendanceRate: '—',
      newMembersJoined: 2,
      registrationTrend: {
        labels: ['Jul 1', 'Jul 8', 'Jul 15', 'Jul 22', 'Jul 29', 'Aug 5'],
        values: [15, 35, 58, 82, 105, 120],
      },
    },
    attendees: mockAttendees.slice(0, 6),
    settings: {
      title: 'Yangon Tech Summit Preview',
      date: '2026-08-30',
      location: 'Sedona Hotel Yangon',
      registration: 'closed',
      approval: 'manual',
    },
  },
};

const eventDetail = computed(() => eventDetailsMap[eventId.value] ?? null);

watch(
  eventDetail,
  (detail) => {
    if (detail) {
      settingsDraft.value = { ...detail.settings };
    }
  },
  { immediate: true }
);

const walkInUrl = computed(() => {
  if (!import.meta.client) return '';
  return `${window.location.origin}/platform/${orgSlug.value}/events/${eventId.value}/walkin`;
});

function goBack() {
  navigateTo(`/platform/${orgSlug.value}/events`);
}

function onSelectAttendee(attendee: EventAttendee) {
  selectedAttendee.value = attendee;
  isProfileOpen.value = true;
}

function onOpenScanner() {
  isScannerOpen.value = true;
}

function onUpdateSettings() {
  toast.add({
    title: 'Event updated',
    description: 'Changes saved locally (mock).',
    color: 'success',
  });
}

function onDeleteEvent() {
  toast.add({
    title: 'Delete event',
    description: 'Event deletion is not wired yet.',
    color: 'warning',
  });
}
</script>

<template>
  <div v-if="!eventDetail" class="flex min-h-[calc(100dvh-11rem)] flex-col items-center justify-center gap-6 py-20">
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

    <CommunityEventDetailSettings
      v-else-if="activeTab === 'settings' && settingsDraft"
      :model-value="settingsDraft"
      @update:model-value="settingsDraft = $event"
      @submit="onUpdateSettings"
      @delete="onDeleteEvent"
    />
  </CommunityEventDetailShell>

  <CommunityEventAttendeeProfileSlideover
    v-model:open="isProfileOpen"
    :attendee="selectedAttendee"
  />

  <CommunityEventCheckInScanner
    v-if="eventDetail"
    v-model:open="isScannerOpen"
    :attendees="eventDetail.attendees"
    :walk-in-url="walkInUrl"
  />
</template>
