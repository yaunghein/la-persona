<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

import type {
  CommunityEvent,
  CommunityEventsData,
} from '~~/shared/types/community-events';

const toast = useToast();
const route = useRoute();
const orgSlug = computed(() => String(route.params.orgSlug || ''));

/** Mock until community events API / schema exists. */
const eventsMock = computed<CommunityEventsData>(() => ({
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
  events: [
    {
      id: '1',
      title: 'Tech Leaders Networking Night 2026',
      dateLabel: '15 May 2026',
      location: 'The Strand Ballroom, Yangon',
      imageUrl: '/images/event-placeholder-1.jpg',
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
      imageUrl: '/images/event-placeholder-2.jpg',
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
      imageUrl: '/images/event-placeholder-3.jpg',
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
      imageUrl: '/images/event-placeholder-1.jpg',
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
      imageUrl: '/images/event-placeholder-2.jpg',
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
      imageUrl: '/images/event-placeholder-3.jpg',
      status: 'upcoming',
      category: 'conference',
      description: 'Preview night ahead of Yangon Tech Summit.',
      date: '2026-08-30',
      startTime: '17:00',
      endTime: '20:00',
      registration: 'closed',
      approval: 'manual',
    },
  ],
}));

function onCreate() {
  navigateTo(`/platform/${orgSlug.value}/events/create`);
}

function onEdit(event: CommunityEvent) {
  navigateTo(`/platform/${orgSlug.value}/events/${event.id}/edit`);
}

async function onShare(event: CommunityEvent) {
  const shareUrl = `${window.location.origin}/platform/${orgSlug.value}/events?event=${event.id}`;
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
  <CommunityEventsList
    :data="eventsMock"
    @create="onCreate"
    @edit="onEdit"
    @share="onShare"
  />
</template>
