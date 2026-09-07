<script setup lang="ts">
import type { EventAttendee } from '~~/shared/types/community-event-detail';

const props = defineProps<{
  attendees: EventAttendee[];
}>();

const emit = defineEmits<{
  'open-scanner': [];
  'open-walk-in': [];
  select: [attendee: EventAttendee];
}>();

const toast = useToast();
const runtimeConfig = useRuntimeConfig();
const searchQuery = ref('');

const hasQuery = computed(() => searchQuery.value.trim().length > 0);

const matchingAttendees = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return [];

  return props.attendees.filter((attendee) => {
    if (attendee.name.toLowerCase().includes(query)) return true;
    if (attendee.company.toLowerCase().includes(query)) return true;

    const email = (attendee.email || '').toLowerCase();
    if (query.includes('@')) {
      if (email.includes(query)) return true;
    } else {
      const localPart = email.split('@')[0] || '';
      if (localPart.includes(query)) return true;
    }

    const phoneDigits = (attendee.phone || '').replace(/\s/g, '');
    const queryDigits = query.replace(/\s/g, '');
    return Boolean(phoneDigits) && phoneDigits.includes(queryDigits);
  });
});

function displayAvatar(attendee: EventAttendee) {
  const raw = String(attendee.avatarUrl || '').trim();
  if (!raw) return undefined;
  if (
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('/') ||
    raw.startsWith('data:')
  ) {
    return raw;
  }

  const bucket = runtimeConfig.public.awsBucketName;
  const region = runtimeConfig.public.awsRegion;
  if (!bucket || !region) return raw;

  return `https://${bucket}.s3.${region}.amazonaws.com/${raw}`;
}

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
    <div class="flex items-center gap-6">
      <UInput
        v-model="searchQuery"
        placeholder="Search Attendees"
        trailing-icon="i-lucide-search"
        color="neutral"
        variant="soft"
        class="min-w-0 flex-1"
        :ui="{
          base: 'h-10 rounded-full border-0 bg-[#232323] px-5 text-sm font-medium text-white ring-0 placeholder:text-[#8b8b8b] focus-visible:ring-0',
          trailing: 'pe-5',
          trailingIcon: 'size-4.5 text-[#8b8b8b]',
        }"
      />
      <span class="shrink-0 text-sm font-medium text-[#8b8b8b]">or</span>
      <UButton
        label="Check in with scanner"
        trailing-icon="i-lucide-qr-code"
        color="neutral"
        block
        :ui="{ trailingIcon: 'size-5' }"
        class="h-10 min-w-0 flex-1 cursor-pointer justify-between rounded-full bg-white py-2 pr-5 pl-5 text-sm font-medium text-dark hover:bg-white/90"
        @click="emit('open-scanner')"
      />
    </div>

    <div
      v-if="hasQuery && !matchingAttendees.length"
      class="flex flex-col items-center justify-center gap-8 pt-30"
    >
      <UIcon name="i-lucide-user-x" class="size-12 text-[#8b8b8b]" />
      <div class="flex max-w-108 flex-col items-center gap-3 text-center">
        <p class="text-xl font-medium tracking-[2px] uppercase text-white">
          Attendee not found
        </p>
        <p class="text-sm text-[#8b8b8b]">
          No registered attendee matches this search. Register them as a
          walk-in instead.
        </p>
      </div>
      <UButton
        label="Register as walk-in"
        color="neutral"
        class="h-9 cursor-pointer justify-center rounded-full bg-white px-5 py-2 text-sm font-medium text-dark hover:bg-white/90"
        @click="emit('open-walk-in')"
      />
    </div>

    <div v-else-if="hasQuery" class="flex flex-col gap-3">
      <div
        v-for="attendee in matchingAttendees"
        :key="attendee.id"
        class="flex flex-col gap-4 rounded-lg bg-[#171717] p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex items-center gap-4">
          <UAvatar
            :src="displayAvatar(attendee)"
            :alt="attendee.name"
            icon="i-lucide-user"
            :ui="{
              root: 'size-12 bg-[#232323]',
              icon: 'size-5 text-[#8b8b8b]',
            }"
          />
          <div>
            <p class="font-medium text-white">{{ attendee.name }}</p>
            <p class="text-sm text-[#8b8b8b]">
              {{ attendee.role }} • {{ attendee.company }}
            </p>
          </div>
        </div>
        <div class="flex items-center justify-end gap-3">
          <UButton
            v-if="attendee.status !== 'checked_in'"
            label="Check-in"
            color="neutral"
            class="h-9 cursor-pointer justify-center rounded-full bg-white px-6 py-2 text-sm font-medium text-dark hover:bg-white/90"
            @click="checkIn(attendee)"
          />
          <span v-else class="text-sm font-medium text-[#8b8b8b]">
            Already checked in
          </span>
          <UButton
            aria-label="View attendee profile"
            icon="i-lucide-scan-eye"
            color="primary"
            size="lg"
            class="bg-white/5 text-white hover:bg-white/15 active:hover:bg-white/20"
            @click="emit('select', attendee)"
          />
        </div>
      </div>
    </div>

    <div
      v-else
      class="flex flex-col items-center justify-center gap-8 pt-30"
    >
      <UIcon name="i-lucide-user-plus" class="size-12 text-[#8b8b8b]" />
      <div class="flex max-w-108 flex-col items-center gap-3 text-center">
        <p class="text-xl font-medium tracking-[2px] uppercase text-white">
          Search to check in
        </p>
        <p class="text-sm text-[#8b8b8b]">
          Find a registered attendee by name, company, or email. If they are
          not on the list, register them as a walk-in.
        </p>
      </div>
      <UButton
        label="Register as walk-in"
        color="neutral"
        class="h-9 cursor-pointer justify-center rounded-full bg-white px-5 py-2 text-sm font-medium text-dark hover:bg-white/90"
        @click="emit('open-walk-in')"
      />
    </div>
  </div>
</template>
