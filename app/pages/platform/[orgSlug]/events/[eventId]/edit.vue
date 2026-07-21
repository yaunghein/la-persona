<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

import type {
  CommunityEvent,
  CommunityEventFormValues,
} from '~~/shared/types/community-events';

const toast = useToast();
const route = useRoute();
const orgSlug = computed(() => String(route.params.orgSlug || ''));
const eventId = computed(() => String(route.params.eventId || ''));

const PLACEHOLDER_IMAGE = '/images/reveal-image.webp';

/** Same mock set as the events list until API exists. */
const mockEvents: CommunityEvent[] = [
  {
    id: '1',
    title: 'Tech Leaders Networking Night 2026',
    dateLabel: '15 May 2026',
    location: 'The Strand Ballroom, No.92, Strand Rd, Yangon',
    imageUrl: PLACEHOLDER_IMAGE,
    status: 'upcoming',
    category: 'networking',
    description:
      'Connect with founders, investors and professionals over an evening of meaningful conversations.',
    date: '2026-05-15',
    startTime: '18:00',
    endTime: '21:00',
    registration: 'open',
    approval: 'everyone',
  },
  {
    id: '2',
    title: 'Founders & Investors Dinner',
    dateLabel: '08 June 2026',
    location: 'Rosewood Yangon',
    imageUrl: PLACEHOLDER_IMAGE,
    status: 'upcoming',
    category: 'networking',
    description: 'An intimate dinner for founders and investors.',
    date: '2026-06-08',
    startTime: '19:00',
    endTime: '22:00',
    registration: 'invite_only',
    approval: 'manual',
  },
  {
    id: '3',
    title: 'Startup Mixer Yangon #12',
    dateLabel: '02 April 2026',
    location: 'Impact Hub Yangon',
    imageUrl: PLACEHOLDER_IMAGE,
    status: 'past',
    category: 'meetup',
    description: 'Monthly mixer for the Yangon startup community.',
    date: '2026-04-02',
    startTime: '18:30',
    endTime: '21:00',
    registration: 'open',
    approval: 'everyone',
  },
  {
    id: '4',
    title: 'Product Design Workshop',
    dateLabel: '22 July 2026',
    location: 'Junction City, Yangon',
    imageUrl: PLACEHOLDER_IMAGE,
    status: 'upcoming',
    category: 'workshop',
    description: 'Hands-on workshop for product and design leads.',
    date: '2026-07-22',
    startTime: '14:00',
    endTime: '17:00',
    registration: 'open',
    approval: 'everyone',
  },
  {
    id: '5',
    title: 'Community AMA: Scaling Teams',
    dateLabel: '10 March 2026',
    location: 'Online',
    imageUrl: PLACEHOLDER_IMAGE,
    status: 'past',
    category: 'meetup',
    description: 'Ask anything about hiring and scaling early teams.',
    date: '2026-03-10',
    startTime: '19:00',
    endTime: '20:30',
    registration: 'open',
    approval: 'everyone',
  },
  {
    id: '6',
    title: 'Yangon Tech Summit Preview',
    dateLabel: '30 August 2026',
    location: 'Sedona Hotel Yangon',
    imageUrl: PLACEHOLDER_IMAGE,
    status: 'upcoming',
    category: 'conference',
    description: 'Preview night ahead of Yangon Tech Summit.',
    date: '2026-08-30',
    startTime: '17:00',
    endTime: '20:00',
    registration: 'closed',
    approval: 'manual',
  },
];

const categoryOptions = [
  { label: 'Networking', value: 'networking' },
  { label: 'Workshop', value: 'workshop' },
  { label: 'Meetup', value: 'meetup' },
  { label: 'Conference', value: 'conference' },
  { label: 'Other', value: 'other' },
];

const registrationOptions = [
  { label: 'Open', value: 'open' },
  { label: 'Closed', value: 'closed' },
  { label: 'Invite only', value: 'invite_only' },
];

const approvalOptions = [
  { label: 'Approve Everyone', value: 'everyone' },
  { label: 'Manual approval', value: 'manual' },
];

const timeOptions = [
  { label: '12:00 PM', value: '12:00' },
  { label: '1:00 PM', value: '13:00' },
  { label: '2:00 PM', value: '14:00' },
  { label: '3:00 PM', value: '15:00' },
  { label: '4:00 PM', value: '16:00' },
  { label: '5:00 PM', value: '17:00' },
  { label: '6:00 PM', value: '18:00' },
  { label: '6:30 PM', value: '18:30' },
  { label: '7:00 PM', value: '19:00' },
  { label: '8:00 PM', value: '20:00' },
  { label: '8:30 PM', value: '20:30' },
  { label: '9:00 PM', value: '21:00' },
  { label: '10:00 PM', value: '22:00' },
];

const event = computed(() =>
  mockEvents.find((item) => item.id === eventId.value)
);

const form = ref<CommunityEventFormValues>({
  title: '',
  category: 'networking',
  description: '',
  date: '',
  startTime: '18:00',
  endTime: '21:00',
  location: '',
  imageUrl: PLACEHOLDER_IMAGE,
  registration: 'open',
  approval: 'everyone',
});

watch(
  event,
  (value) => {
    if (!value) return;
    form.value = {
      title: value.title,
      category: value.category,
      description: value.description,
      date: value.date,
      startTime: value.startTime,
      endTime: value.endTime,
      location: value.location,
      imageUrl: value.imageUrl,
      registration: value.registration,
      approval: value.approval,
    };
  },
  { immediate: true }
);

function goBack() {
  navigateTo(`/platform/${orgSlug.value}/events`);
}

function onSubmit() {
  toast.add({
    title: 'Changes saved',
    description: 'Mock save — events API is not wired yet.',
    color: 'success',
  });
  goBack();
}

function onDelete() {
  toast.add({
    title: 'Event deleted',
    description: 'Mock delete — events API is not wired yet.',
    color: 'warning',
  });
  goBack();
}
</script>

<template>
  <div
    v-if="!event"
    class="flex min-h-[calc(100dvh-11rem)] items-center justify-center"
  >
    <div class="space-y-4 text-center">
      <p class="text-sm text-[#8b8b8b]">Event not found.</p>
      <UButton
        label="Back to Events"
        color="neutral"
        class="rounded-full bg-white px-5 font-medium text-dark hover:bg-white/90"
        @click="goBack"
      />
    </div>
  </div>

  <CommunityEventForm
    v-else
    v-model="form"
    mode="edit"
    :category-options="categoryOptions"
    :registration-options="registrationOptions"
    :approval-options="approvalOptions"
    :time-options="timeOptions"
    @submit="onSubmit"
    @cancel="goBack"
    @delete="onDelete"
  />
</template>
