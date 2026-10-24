<script setup lang="ts">
import type { EventDTO, EventOrganizer } from '~~/shared/contracts/event';

defineProps<{
  event?: EventDTO | null;
  organizer?: EventOrganizer | null;
}>();

const open = defineModel<boolean>('open', { default: false });

const emit = defineEmits<{
  viewOrganizer: [event: EventDTO];
}>();

const step = ref<'confirm' | 'registering' | 'success'>('confirm');

const slideoverTitle = computed(() =>
  step.value === 'success' ? "You're all set" : 'Event Details'
);
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    inset
    :title="slideoverTitle"
    close-icon="i-material-symbols:close-small"
    unmount-on-hide
    :ui="{
      content: 'bg-surface sm:max-w-[480px] divide-y-0',
      header: 'border-b-2 border-raised px-6 py-6',
      title: 'text-sm font-medium tracking-[1.4px] text-ink uppercase',
      body: 'flex flex-1 flex-col p-0!',
      footer: 'hidden p-0',
    }"
  >
    <template v-if="event" #body>
      <EventRegisterFlow
        :event="event"
        :organizer="organizer"
        @step-change="step = $event"
        @view-organizer="emit('viewOrganizer', $event)"
      />
    </template>
  </USlideover>
</template>
