<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

import { useQuery } from '@tanstack/vue-query';
import type { EventDTO } from '~~/shared/types/event';
import {
  toCommunityEvent,
  type CommunityEvent,
  type CommunityEventsData,
} from '~~/shared/types/community-events';

const toast = useToast();
const route = useRoute();
const orgSlug = computed(() => String(route.params.orgSlug || ''));
const isCreateOpen = ref(false);
const isEditOpen = ref(false);
const editingEvent = ref<EventDTO | null>(null);

const { data, isLoading, refetch } = useQuery<{ events: EventDTO[] }>({
  queryKey: ['events', orgSlug],
  queryFn: () =>
    $fetch('/api/events', {
      query: { organizationSlug: orgSlug.value },
    }),
});

const eventsListData = computed<CommunityEventsData>(() => ({
  title: 'Events in Your Community',
  searchPlaceholder: 'Search Events',
  statusOptions: [
    { label: 'Upcoming Events', value: 'upcoming' },
    { label: 'Past Events', value: 'past' },
  ],
  infoItems: [
    {
      icon: 'i-lucide-calendar-plus',
      title: 'Create events',
      description:
        'Publish upcoming gatherings with cover art, schedule, and venue details.',
    },
    {
      icon: 'i-lucide-user-check',
      title: 'Control registration',
      description:
        'Choose open or invite-only registration and how approvals work.',
    },
    {
      icon: 'i-lucide-share-2',
      title: 'Share with members',
      description: 'Send event links so your community can RSVP and show up.',
    },
  ],
  events: (data.value?.events ?? []).map(toCommunityEvent),
}));

function onCreate() {
  isCreateOpen.value = true;
}

function onEdit(event: CommunityEvent) {
  editingEvent.value =
    data.value?.events.find((item) => item.id === event.id) ?? null;
  isEditOpen.value = true;
}

function onView(event: CommunityEvent) {
  navigateTo(`/platform/${orgSlug.value}/events/${event.id}`);
}

async function onShare(event: CommunityEvent) {
  const shareUrl = `${window.location.origin}/platform/${orgSlug.value}/events/${event.id}`;
  try {
    await navigator.clipboard.writeText(shareUrl);
    toast.add({
      title: 'Link copied',
      description: `Share link for “${event.title}” copied.`,
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
  <div class="flex min-h-[calc(100dvh-11rem)] flex-col">
    <div v-if="isLoading" class="flex flex-1 flex-col gap-6 pt-2 sm:pt-0">
      <USkeleton class="h-8 w-64 rounded-md" />
      <USkeleton class="h-10 w-full rounded-full" />
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <USkeleton
          v-for="index in 3"
          :key="index"
          class="aspect-[1/0.9] w-full rounded-lg"
        />
      </div>
    </div>

    <CommunityEventsList
      v-else
      :data="eventsListData"
      @create="onCreate"
      @edit="onEdit"
      @share="onShare"
      @view="onView"
    />
  </div>

  <CommunityCreateEventSlideover
    v-model:open="isCreateOpen"
    @created="() => refetch()"
  />
  <CommunityCreateEventSlideover
    v-model:open="isEditOpen"
    :event="editingEvent"
    @updated="() => refetch()"
    @deleted="() => refetch()"
  />
</template>
