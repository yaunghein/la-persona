<script setup lang="ts">
import type { EventAttendee } from '~~/shared/types/community-event-detail';

const props = defineProps<{
  attendee: EventAttendee | null;
}>();

const open = defineModel<boolean>('open', { default: false });

const toast = useToast();

function onRemove() {
  toast.add({
    title: 'Remove attendee',
    description: 'Attendee removal is not wired yet.',
    color: 'warning',
  });
}

function onViewPersona() {
  toast.add({
    title: 'Persona card',
    description: props.attendee
      ? `Opening persona card for ${props.attendee.name}.`
      : 'Persona card coming soon.',
    color: 'neutral',
  });
}
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    inset
    title="ATTENDEE PROFILE"
    :ui="{
      header: 'border-b-2 border-[#232323] px-6 py-6',
      title: 'text-sm font-medium tracking-[1.4px] text-white uppercase',
      body: 'px-6',
      footer: 'border-t border-[#232323] px-6 py-6',
    }"
  >
    <template v-if="attendee" #body>
      <div class="flex flex-col gap-8 py-2">
        <div class="flex flex-col items-center gap-4 pt-2 text-center">
          <div
            class="flex size-20 items-center justify-center overflow-hidden rounded-full bg-[#232323]"
          >
            <img
              src="/images/favicon.png"
              :alt="attendee.name"
              class="size-12 object-contain"
            />
          </div>
          <div>
            <h2
              class="text-lg font-medium tracking-widest uppercase text-white"
            >
              {{ attendee.name }}
            </h2>
            <p class="mt-1 text-sm text-[#8b8b8b]">
              {{ attendee.role }} • {{ attendee.company }}
            </p>
          </div>
        </div>

        <div class="space-y-4">
          <div class="flex items-center justify-between border-b border-[#232323] py-3">
            <span class="text-sm text-[#8b8b8b]">Membership Status</span>
            <span class="text-sm text-white">{{ attendee.membershipStatus }}</span>
          </div>
          <div class="flex items-center justify-between border-b border-[#232323] py-3">
            <span class="text-sm text-[#8b8b8b]">Joined</span>
            <span class="text-sm text-white">{{ attendee.joinedAt }}</span>
          </div>
        </div>

        <section class="space-y-4">
          <h3 class="text-sm font-medium uppercase tracking-widest text-white">
            Event Registration
          </h3>
          <div class="flex items-center justify-between border-b border-[#232323] py-3">
            <span class="text-sm text-[#8b8b8b]">Registered</span>
            <span class="text-sm text-white">{{ attendee.registeredAt }}</span>
          </div>
          <div class="flex items-center justify-between border-b border-[#232323] py-3">
            <span class="text-sm text-[#8b8b8b]">Checked In</span>
            <span class="text-sm text-white">
              {{ attendee.checkedInAt ?? '—' }}
            </span>
          </div>
        </section>

        <section class="space-y-4">
          <h3 class="text-sm font-medium uppercase tracking-widest text-white">
            Community Activity
          </h3>
          <div class="flex items-center justify-between border-b border-[#232323] py-3">
            <span class="text-sm text-[#8b8b8b]">Events Attended</span>
            <span class="text-sm text-white">{{ attendee.eventsAttended }}</span>
          </div>
          <div class="flex items-center justify-between border-b border-[#232323] py-3">
            <span class="text-sm text-[#8b8b8b]">Connections Made</span>
            <span class="text-sm text-white">{{ attendee.connectionsMade }}</span>
          </div>
        </section>
      </div>
    </template>

    <template v-if="attendee" #footer>
      <div class="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
        <UButton
          label="Remove"
          leading-icon="i-lucide-user-minus"
          color="neutral"
          class="h-9 cursor-pointer justify-center rounded-full bg-[#232323] py-2 pr-6 pl-5 text-sm font-medium text-white hover:bg-[#2a2a2a]"
          @click="onRemove"
        />
        <UButton
          label="View Persona Card"
          leading-icon="i-lucide-eye"
          color="neutral"
          class="h-9 cursor-pointer justify-center rounded-full bg-white py-2 pr-6 pl-5 text-sm font-medium text-dark hover:bg-white/90"
          @click="onViewPersona"
        />
      </div>
    </template>
  </USlideover>
</template>
