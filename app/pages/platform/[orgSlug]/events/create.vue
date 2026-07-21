<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

import type { CommunityEventFormValues } from '~~/shared/types/community-events';

const toast = useToast();
const route = useRoute();
const orgSlug = computed(() => String(route.params.orgSlug || ''));

const PLACEHOLDER_IMAGE = '/images/reveal-image.webp';

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

function goBack() {
  navigateTo(`/platform/${orgSlug.value}/events`);
}

function onSubmit() {
  if (!form.value.title.trim()) {
    toast.add({
      title: 'Event name required',
      description: 'Add a name before creating the event.',
      color: 'warning',
    });
    return;
  }

  toast.add({
    title: 'Event created',
    description: 'Mock save — events API is not wired yet.',
    color: 'success',
  });
  goBack();
}
</script>

<template>
  <CommunityEventForm
    v-model="form"
    mode="create"
    :category-options="categoryOptions"
    :registration-options="registrationOptions"
    :approval-options="approvalOptions"
    :time-options="timeOptions"
    @submit="onSubmit"
    @cancel="goBack"
  />
</template>
