<script setup lang="ts">
import type {
  CommunityEventDetailData,
  CommunityEventDetailTab,
  EventAttendee,
  EventBroadcastKind,
} from '~~/shared/contracts/event';
import { publicEventAbsoluteUrl } from '~~/shared/utils/routes';
import {
  eventPhase,
  formatEventDateTimeRange,
  formatEventDateValue,
  registrationBlockReason,
} from '~~/shared/utils/event-datetime';

definePageMeta({
  layout: 'platform',
});

const toast = useToast();
const route = useRoute();
const { organizationSlug } = useOrganizationSlug();
const eventId = computed(() => String(route.params.eventId || ''));
const { data: userOrgs } = useUserOrganizations();
const canManage = computed(() =>
  isCommunityManager(
    (userOrgs.value || []).find((org) => org.slug === organizationSlug.value)
  )
);

const activeTab = ref<CommunityEventDetailTab>('overview');
const isProfileOpen = ref(false);
const isScannerOpen = ref(false);
const isWalkInOpen = ref(false);
const isEditOpen = ref(false);
const selectedAttendee = ref<EventAttendee | null>(null);
const isBroadcastOpen = ref(false);
const broadcastKind = ref<EventBroadcastKind>('reminder');

const {
  data: event,
  isLoading,
  refetch: refetchEvent,
} = useEventQuery(eventId);
const { data: attendees, refetch: refetchAttendees } =
  useEventAttendeesQuery(eventId);
const { mutate: approveRegistration } = useApproveRegistrationMutation();

function approveAttendee(attendee: EventAttendee) {
  approveRegistration(attendee.id, {
    onSuccess: () =>
      toast.add({ title: 'Registration approved', color: 'success' }),
    onError: (error) =>
      toast.add({
        title: 'Could not approve',
        description: apiErrorMessage(error),
        color: 'error',
      }),
  });
}

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
    attendees: attendees.value ?? [],
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

const broadcastRecipientCount = computed(() => {
  return (attendees.value ?? []).filter((attendee) =>
    broadcastKind.value === 'reminder'
      ? attendee.status !== 'pending'
      : attendee.status === 'checked_in'
  ).length;
});

const broadcastLastSentAt = computed(() =>
  broadcastKind.value === 'reminder'
    ? (event.value?.reminderEmailSentAt ?? null)
    : (event.value?.afterEventEmailSentAt ?? null)
);

function onSendEmail(kind: EventBroadcastKind) {
  broadcastKind.value = kind;
  isBroadcastOpen.value = true;
}

const { mutate: broadcastEmail, isPending: isSendingBroadcast } =
  useBroadcastEventEmailMutation(eventId);

function sendBroadcast(kind: EventBroadcastKind) {
  broadcastEmail(kind, {
    onSuccess: async (result) => {
      isBroadcastOpen.value = false;
      await refetchEvent();
      toast.add({
        title: 'Emails on the way',
        description:
          `Sending to ${result.recipientCount} ${result.recipientCount === 1 ? 'attendee' : 'attendees'}.` +
          (result.skipped > 0
            ? ` ${result.skipped} without a community card were skipped (no QR ticket).`
            : ''),
        color: 'success',
      });
    },
    onError: (error) =>
      toast.add({
        title: 'Could not send emails',
        description: apiErrorMessage(error),
        color: 'error',
      }),
  });
}

function reloadEvent() {
  refetchEvent();
}

async function onCheckedIn() {
  await Promise.all([refetchEvent(), refetchAttendees()]);
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

  <EventDetailShell
    v-else
    :title="eventDetail.title"
    :status="eventDetail.status"
    :active-tab="activeTab"
    :phase="phase"
    :can-edit="canManage"
    @back="goBack"
    @edit="onEdit"
    @share="onShare"
    @send-email="onSendEmail"
    @update:active-tab="activeTab = $event"
  >
    <EventOverview
      v-if="activeTab === 'overview'"
      :data="eventDetail.overview"
    />

    <EventAttendees
      v-else-if="activeTab === 'attendees'"
      :attendees="eventDetail.attendees"
      :allow-approve="canManage && phase !== 'past'"
      @select="onSelectAttendee"
      @approve="approveAttendee"
    />

    <EventCheckIn
      v-else-if="activeTab === 'check-in'"
      :attendees="eventDetail.attendees"
      :check-in-phase="phase"
      :can-walk-in="canWalkIn"
      @open-scanner="onOpenScanner"
      @open-walk-in="onOpenWalkIn"
      @select="onSelectAttendee"
    />
  </EventDetailShell>

  <EventAttendeeProfileSlideover
    :key="selectedAttendee?.id ?? 'attendee-profile'"
    v-model:open="isProfileOpen"
    :attendee="selectedAttendee"
  />

  <EventCheckInScanner
    v-if="eventDetail"
    v-model:open="isScannerOpen"
    :event-id="eventId"
    :attendees="eventDetail.attendees"
    @checked-in="onCheckedIn"
  />

  <EventBroadcastEmailModal
    v-if="canManage"
    v-model:open="isBroadcastOpen"
    :kind="broadcastKind"
    :recipient-count="broadcastRecipientCount"
    :last-sent-at="broadcastLastSentAt"
    :sending="isSendingBroadcast"
    @confirm="sendBroadcast(broadcastKind)"
  />

  <EventWalkInRegistrationSlideover
    v-model:open="isWalkInOpen"
    :walk-in-url="walkInUrl"
  />

  <EventCreateSlideover
    v-if="event && canManage"
    v-model:open="isEditOpen"
    :event="event"
    @deleted="goBack"
    @updated="reloadEvent"
  />
</template>
