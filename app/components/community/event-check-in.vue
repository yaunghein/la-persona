<script setup lang="ts">
import type { EventAttendee } from '~~/shared/types/community-event-detail';

const props = defineProps<{
  attendees: EventAttendee[];
}>();

const emit = defineEmits<{
  'open-scanner': [];
}>();

const toast = useToast();
const searchQuery = ref('');

const matchingAttendees = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return [];

  return props.attendees.filter(
    (attendee) =>
      attendee.name.toLowerCase().includes(query) ||
      attendee.role.toLowerCase().includes(query) ||
      attendee.company.toLowerCase().includes(query) ||
      attendee.email?.toLowerCase().includes(query) ||
      attendee.phone?.includes(query)
  );
});

function checkIn(attendee: EventAttendee) {
  toast.add({
    title: 'Checked in',
    description: `${attendee.name} has been checked in.`,
    color: 'success',
  });
  searchQuery.value = '';
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <div
      class="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center"
    >
      <UInput
        v-model="searchQuery"
        placeholder="Search Attendees"
        trailing-icon="i-lucide-search"
        color="neutral"
        variant="soft"
        class="w-full flex-1"
        :ui="{
          base: 'h-9 rounded-full border-0 bg-[#232323] px-5 text-sm font-medium text-white ring-0 placeholder:text-[#8b8b8b] focus-visible:ring-0',
          trailing: 'pe-5',
          trailingIcon: 'size-6 text-[#8b8b8b]',
        }"
      />
      <span class="hidden text-center text-sm text-[#8b8b8b] sm:block">or</span>
      <UButton
        label="Check in with scanner"
        leading-icon="i-lucide-qr-code"
        color="neutral"
        class="h-9 shrink-0 cursor-pointer justify-center rounded-full bg-white py-2 pr-6 pl-5 text-sm font-medium text-dark hover:bg-white/90"
        @click="emit('open-scanner')"
      />
    </div>

    <div v-if="searchQuery.trim()" class="flex flex-col gap-3">
      <p
        v-if="!matchingAttendees.length"
        class="py-8 text-center text-sm text-[#8b8b8b]"
      >
        No attendees match your search.
      </p>

      <div
        v-for="attendee in matchingAttendees"
        :key="attendee.id"
        class="flex flex-col gap-4 rounded-lg bg-[#171717] p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex items-center gap-4">
          <div
            class="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#232323]"
          >
            <img
              src="/images/favicon.png"
              :alt="attendee.name"
              class="size-7 object-contain"
            />
          </div>
          <div>
            <p class="font-medium text-white">{{ attendee.name }}</p>
            <p class="text-sm text-[#8b8b8b]">
              {{ attendee.role }} • {{ attendee.company }}
            </p>
          </div>
        </div>
        <UButton
          v-if="attendee.status !== 'checked_in'"
          label="Check-in"
          color="neutral"
          class="h-9 w-full cursor-pointer justify-center rounded-full bg-white py-2 px-6 text-sm font-medium text-dark hover:bg-white/90 sm:w-auto"
          @click="checkIn(attendee)"
        />
        <span
          v-else
          class="text-sm font-medium text-[#8b8b8b]"
        >
          Already checked in
        </span>
      </div>
    </div>

    <div
      v-else
      class="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-[#232323] py-16 text-center"
    >
      <UIcon name="i-lucide-qr-code" class="size-12 text-[#8b8b8b]" />
      <div class="space-y-1">
        <p class="text-sm font-medium text-white">Search or scan to check in</p>
        <p class="text-sm text-[#8b8b8b]">
          Find an attendee by name or use the QR scanner.
        </p>
      </div>
    </div>
  </div>
</template>
