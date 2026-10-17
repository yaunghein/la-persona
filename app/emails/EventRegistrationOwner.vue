<script setup lang="ts">
import { computed } from 'vue';
import EmailButton from './components/EmailButton.vue';
import EmailDetails from './components/EmailDetails.vue';
import EmailLayout from './components/EmailLayout.vue';

// Defaults are sample data for the email renderer devtools preview.
const props = withDefaults(
  defineProps<{
    ownerName?: string;
    attendeeName?: string;
    attendeeEmail?: string;
    eventTitle?: string;
    /** Manual-approval events: the registration waits for the owner. */
    pending?: boolean;
    registeredCount?: number;
    capacity?: number | null;
    attendeesUrl?: string;
  }>(),
  {
    ownerName: 'Thiri',
    attendeeName: 'Aung Pyae Kyaw',
    attendeeEmail: 'aung@example.com',
    eventTitle: 'Imagine First 2026',
    pending: false,
    registeredCount: 42,
    capacity: 100,
    attendeesUrl: '#',
  }
);

const rows = computed(() => [
  {
    label: 'Attendee',
    value: `${props.attendeeName} <${props.attendeeEmail}>`,
  },
  { label: 'Event', value: props.eventTitle },
  {
    label: 'Status',
    value: props.pending ? 'Waiting for approval' : 'Registered',
  },
  {
    label: 'Registered',
    value: props.capacity
      ? `${props.registeredCount} / ${props.capacity}`
      : String(props.registeredCount),
  },
]);
</script>

<template>
  <EmailLayout :preview="`${attendeeName} registered for ${eventTitle}`">
    <EHeading
      as="h4"
      style="
        margin: 0;
        font-weight: 600;
        letter-spacing: 1px;
        text-transform: uppercase;
      "
    >
      {{ pending ? 'New registration to review' : 'New registration' }}
    </EHeading>
    <EText style="margin: 12px 0 0; line-height: 1.5">
      Hi {{ ownerName }},
      <strong style="font-weight: 700">{{ attendeeName }}</strong>
      {{ pending ? 'asked to join' : 'registered for' }}
      <strong style="font-weight: 700">{{ eventTitle }}</strong
      >.
      <template v-if="pending"
        >Approve them to confirm their&nbsp;spot.</template
      >
    </EText>

    <EmailDetails :rows="rows" />

    <EmailButton :href="attendeesUrl">
      {{ pending ? 'REVIEW REGISTRATION' : 'VIEW ATTENDEES' }}
    </EmailButton>
  </EmailLayout>
</template>
