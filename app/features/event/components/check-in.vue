<script setup lang="ts">
import type { EventAttendee } from '~~/shared/contracts/event';
import type { EventPhase } from '~~/shared/utils/event-datetime';

const props = defineProps<{
  eventId: string;
  attendees: EventAttendee[];
  checkInPhase?: EventPhase;
  canWalkIn?: boolean;
  /** Organizers download who checked in. Volunteers do not see the button. */
  canExport?: boolean;
}>();

const emit = defineEmits<{
  'open-scanner': [];
  'open-walk-in': [];
  'open-manual-registration': [];
  'checked-in': [];
  select: [attendee: EventAttendee];
  export: [];
}>();

const toast = useToast();
const searchQuery = ref('');
const checkingInId = ref<string | null>(null);

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

  return resolveObjectStorageUrl(raw);
}

async function checkIn(attendee: EventAttendee) {
  if (props.checkInPhase !== 'live' || checkingInId.value) return;
  if (attendee.status !== 'registered') return;
  if (!attendee.cardSlug) {
    toast.add({
      title: 'Check-in failed',
      description: 'This attendee has no card to check in.',
      color: 'error',
    });
    return;
  }

  checkingInId.value = attendee.id;
  try {
    await checkInAttendee(props.eventId, attendee.cardSlug);
    toast.add({
      title: 'Checked in',
      description: `${attendee.name} has been checked in.`,
      color: 'success',
    });
    searchQuery.value = '';
    emit('checked-in');
  } catch (error) {
    toast.add({
      title: 'Check-in failed',
      description: apiErrorMessage(error, 'Try again.'),
      color: 'error',
    });
  } finally {
    checkingInId.value = null;
  }
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <div class="flex flex-col gap-2">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        <UInput
          v-model="searchQuery"
          placeholder="Search Attendees"
          trailing-icon="i-lucide-search"
          color="neutral"
          variant="soft"
          class="w-full min-w-0 sm:flex-1"
          :ui="{
            base: 'h-10 rounded-full border-0 bg-raised ps-5 pe-11 text-sm font-medium text-ink ring-0 placeholder:text-subtle focus-visible:ring-0',
            trailing: 'pe-5',
            trailingIcon: 'size-4.5 text-subtle',
          }"
        />
        <span class="shrink-0 text-center text-sm font-medium text-subtle"
          >or</span
        >
        <div class="flex min-w-0 flex-1 items-center gap-2">
          <UButton
            label="Check in with scanner"
            trailing-icon="i-lucide-qr-code"
            color="neutral"
            block
            :disabled="checkInPhase !== 'live'"
            class="h-10 min-w-0 flex-1 cursor-pointer justify-between rounded-full bg-ink pr-5 pl-5 text-sm font-medium text-ink-inverse hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-raised disabled:text-subtle disabled:opacity-100"
            @click="emit('open-scanner')"
          />
          <UTooltip v-if="canExport" text="Export check-ins">
            <UButton
              icon="i-material-symbols:download-sharp"
              color="neutral"
              variant="ghost"
              class="flex h-10 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-raised p-0 text-ink hover:bg-line"
              aria-label="Export check-ins"
              @click="emit('export')"
            />
          </UTooltip>
        </div>
      </div>
      <p
        v-if="checkInPhase !== 'live'"
        class="text-center text-sm text-subtle sm:text-right"
        :class="canExport ? 'sm:pr-13' : undefined"
      >
        {{
          checkInPhase === 'before'
            ? 'Check-in opens on the event\u00a0day.'
            : 'This event has ended.'
        }}
      </p>
    </div>

    <div
      v-if="hasQuery && !matchingAttendees.length"
      class="flex flex-col items-center justify-center gap-8 pt-30"
    >
      <UIcon name="i-lucide-user-x" class="size-12 text-subtle" />
      <div class="flex max-w-108 flex-col items-center gap-3 text-center">
        <p class="text-xl font-medium tracking-[2px] uppercase text-ink">
          Attendee not found
        </p>
        <p class="text-sm text-subtle">
          {{
            canWalkIn
              ? 'No registered attendee matches this search. Register them as a walk-in, or use No email check-in if they have no\u00a0email.'
              : 'No registered attendee matches this search. Use No email check-in if they have no\u00a0email.'
          }}
        </p>
      </div>
      <div class="flex flex-wrap items-center justify-center gap-3">
        <UButton
          v-if="canWalkIn"
          label="Register as walk-in"
          color="neutral"
          class="h-10 cursor-pointer justify-center rounded-full bg-ink px-5 text-sm font-medium text-ink-inverse hover:bg-ink/90"
          @click="emit('open-walk-in')"
        />
        <UButton
          label="No email check-in"
          color="neutral"
          :disabled="checkInPhase !== 'live'"
          class="h-10 cursor-pointer justify-center rounded-full bg-raised px-5 text-sm font-medium text-ink hover:bg-line disabled:cursor-not-allowed disabled:bg-raised disabled:text-subtle disabled:opacity-100"
          @click="emit('open-manual-registration')"
        />
      </div>
    </div>

    <div v-else-if="hasQuery" class="flex flex-col gap-3">
      <div
        v-for="attendee in matchingAttendees"
        :key="attendee.id"
        class="flex items-center gap-4 rounded-lg bg-surface p-4"
      >
        <UAvatar
          :src="displayAvatar(attendee)"
          :alt="attendee.name"
          icon="i-lucide-user"
          class="shrink-0"
          :ui="{
            root: 'size-12 bg-raised',
            icon: 'size-5 text-subtle',
          }"
        />
        <div class="min-w-0 flex-1">
          <div class="flex min-w-0 items-center gap-2">
            <p class="truncate font-medium text-ink">{{ attendee.name }}</p>
            <EventNoEmailBadge v-if="!attendee.hasEmail" />
          </div>
          <p
            v-if="attendee.role || attendee.company"
            class="truncate text-sm text-subtle"
          >
            {{ [attendee.role, attendee.company].filter(Boolean).join(' • ') }}
          </p>
          <div
            v-if="attendee.labels.length"
            class="mt-2 flex flex-wrap gap-1.5"
          >
            <UiLabelChip
              v-for="label in attendee.labels"
              :key="label.id"
              :label="label"
            />
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-3">
          <UButton
            v-if="attendee.status === 'registered'"
            label="Check-in"
            color="neutral"
            :loading="checkingInId === attendee.id"
            :disabled="checkInPhase !== 'live' || checkingInId === attendee.id"
            class="h-10 cursor-pointer justify-center rounded-full bg-ink px-6 text-sm font-medium text-ink-inverse hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-raised disabled:text-subtle disabled:opacity-100"
            @click="checkIn(attendee)"
          />
          <span
            v-else-if="attendee.status === 'checked_in'"
            class="text-sm font-medium text-subtle"
          >
            Already checked in
          </span>
          <UTooltip text="View attendee profile">
            <UButton
              aria-label="View attendee profile"
              icon="i-lucide-scan-eye"
              color="primary"
              size="lg"
              class="bg-ink/5 text-ink hover:bg-ink/15 active:hover:bg-ink/20"
              @click="emit('select', attendee)"
            />
          </UTooltip>
        </div>
      </div>
    </div>

    <div v-else class="flex flex-col items-center justify-center gap-8 pt-30">
      <UIcon name="i-lucide-user-plus" class="size-12 text-subtle" />
      <div class="flex max-w-108 flex-col items-center gap-3 text-center">
        <p class="text-xl font-medium tracking-[2px] uppercase text-ink">
          Search to check in
        </p>
        <p class="text-sm text-subtle">
          {{
            canWalkIn
              ? 'Find a registered attendee by name, company, or email. If they are not on the list, register them as a walk-in, or use No email check-in if they have no\u00a0email.'
              : 'Find a registered attendee by name, company, or email. If someone has no email, use No email\u00a0check-in.'
          }}
        </p>
      </div>
      <div class="flex flex-wrap items-center justify-center gap-3">
        <UButton
          v-if="canWalkIn"
          label="Register as walk-in"
          color="neutral"
          class="h-10 cursor-pointer justify-center rounded-full bg-ink px-5 text-sm font-medium text-ink-inverse hover:bg-ink/90"
          @click="emit('open-walk-in')"
        />
        <UButton
          label="No email check-in"
          color="neutral"
          :disabled="checkInPhase !== 'live'"
          class="h-10 cursor-pointer justify-center rounded-full bg-raised px-5 text-sm font-medium text-ink hover:bg-line disabled:cursor-not-allowed disabled:bg-raised disabled:text-subtle disabled:opacity-100"
          @click="emit('open-manual-registration')"
        />
      </div>
    </div>
  </div>
</template>
