<script setup lang="ts">
import type { EventAttendee } from '~~/shared/contracts/event';
import { formatDateLabel, formatTimeLabel } from '~~/shared/utils/datetime';
import { internationalPhone } from '~~/shared/utils/phone';

defineOptions({ name: 'CommunityEventAttendeeProfileSlideover' });

const props = defineProps<{
  attendee: EventAttendee | null;
  /** Organizers attach labels; volunteers only see them. */
  canEditLabels?: boolean;
}>();

const open = defineModel<boolean>('open', { default: false });

const toast = useToast();
const { organizationSlug } = useOrganizationSlug();
const { data: labels, isLoading: isLabelsLoading } = useAttendeeLabelsQuery(
  () => (props.canEditLabels ? organizationSlug.value : '')
);
const { mutateAsync: replaceLabels } = useReplaceRegistrationLabelsMutation();
const { mutateAsync: createLabel } =
  useCreateAttendeeLabelMutation(organizationSlug);

const labelIds = computed(
  () => props.attendee?.labels.map((label) => label.id) ?? []
);

async function saveLabels(ids: string[]) {
  if (!props.attendee) return;
  try {
    await replaceLabels({ registrationId: props.attendee.id, labelIds: ids });
  } catch (error) {
    toast.add({
      title: 'Could not update labels',
      description: apiErrorMessage(error),
      color: 'error',
    });
  }
}

async function addNewLabel(name: string) {
  try {
    const created = await createLabel({
      name,
      color: nextLabelColor(labels.value ?? []),
    });
    await saveLabels([...labelIds.value, created.id]);
  } catch (error) {
    toast.add({
      title: 'Could not create label',
      description: apiErrorMessage(error),
      color: 'error',
    });
  }
}

const displayAvatar = computed(() => {
  const raw = String(props.attendee?.avatarUrl || '').trim();
  if (!raw) return null;
  if (
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('/') ||
    raw.startsWith('data:')
  ) {
    return raw;
  }

  return resolveObjectStorageUrl(raw);
});

const personaCardUrl = computed(() =>
  props.attendee?.cardSlug ? `/c/${props.attendee.cardSlug}` : undefined
);

function onViewPersona() {
  if (personaCardUrl.value) return;
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
    close-icon="i-material-symbols:close-small"
    unmount-on-hide
    :ui="{
      content: 'bg-surface',
      header: 'border-b-2 border-raised px-6 py-6',
      title: 'text-sm font-medium tracking-[1.4px] text-ink uppercase',
      body: 'px-6',
    }"
  >
    <template v-if="attendee" #body>
      <div class="flex flex-col gap-8 py-2">
        <div class="flex flex-col items-center gap-4 pt-2 text-center">
          <UAvatar
            :src="displayAvatar || undefined"
            :alt="attendee.name"
            icon="i-lucide-user"
            :ui="{
              root: 'size-24 bg-raised',
              icon: 'size-10 text-subtle',
            }"
          />
          <div class="space-y-1">
            <h2 class="text-xl font-medium tracking-[2px] uppercase text-ink">
              {{ attendee.name }}
            </h2>
            <p
              v-if="attendee.role || attendee.company"
              class="flex items-center justify-center gap-x-2 text-xs text-subtle"
            >
              <span v-if="attendee.role">{{ attendee.role }}</span>
              <span v-if="attendee.role && attendee.company" aria-hidden="true"
                >•</span
              >
              <span v-if="attendee.company">{{ attendee.company }}</span>
            </p>
            <p v-if="attendee.email" class="text-xs text-subtle">
              {{ attendee.email }}
            </p>
            <div
              v-if="!attendee.hasEmail || attendee.isWalkIn"
              class="flex justify-center gap-2 pt-1"
            >
              <EventNoEmailBadge v-if="!attendee.hasEmail" />
              <EventWalkInBadge v-if="attendee.isWalkIn" />
            </div>
          </div>
        </div>

        <section v-if="!attendee.hasEmail">
          <h3 class="pb-3 text-sm font-medium text-ink">Walk-in Details</h3>
          <div
            class="flex items-center justify-between border-b border-line px-4 py-3"
          >
            <span class="text-sm text-subtle">Phone</span>
            <span class="text-sm font-bold text-ink">{{
              attendee.phone
                ? internationalPhone(attendee.phone, attendee.phoneCountryCode)
                : '—'
            }}</span>
          </div>
          <div class="flex flex-col gap-1 px-4 py-3">
            <span class="text-sm text-subtle">Note</span>
            <p class="text-sm whitespace-pre-line text-ink">
              {{ attendee.note || '—' }}
            </p>
          </div>
        </section>

        <div v-else>
          <div
            class="flex items-center justify-between border-b border-line px-4 py-3"
          >
            <span class="text-sm text-subtle">Membership Status</span>
            <span class="text-sm font-bold text-ink">{{
              attendee.membershipStatus
            }}</span>
          </div>
          <div class="flex items-center justify-between px-4 py-3">
            <span class="text-sm text-subtle">Joined</span>
            <span class="text-sm font-bold text-ink">{{
              attendee.joinedAt ? formatDateLabel(attendee.joinedAt) : '—'
            }}</span>
          </div>
        </div>

        <section>
          <h3 class="pb-3 text-sm font-medium text-ink">Event Registration</h3>
          <div
            class="flex items-center justify-between border-b border-line px-4 py-3"
          >
            <span class="text-sm text-subtle">Registered</span>
            <span class="text-sm font-bold text-ink">{{
              attendee.registeredAt
                ? formatDateLabel(attendee.registeredAt)
                : '—'
            }}</span>
          </div>
          <div class="flex items-center justify-between px-4 py-3">
            <span class="text-sm text-subtle">Checked In</span>
            <span class="text-sm font-bold text-ink">
              {{
                attendee.checkedInAt
                  ? formatTimeLabel(attendee.checkedInAt)
                  : '—'
              }}
            </span>
          </div>
        </section>

        <section v-if="canEditLabels || attendee.labels.length">
          <h3 class="pb-3 text-sm font-medium text-ink">Labels</h3>
          <div class="flex flex-col gap-3 px-4">
            <UiLabelSelect
              v-if="canEditLabels"
              :model-value="labelIds"
              :labels="labels ?? []"
              :loading="isLabelsLoading"
              placeholder="Add labels"
              creatable
              class="w-full"
              :ui="{
                base: 'h-10 rounded-[4px] border-line bg-raised text-sm text-ink',
              }"
              @update:model-value="saveLabels"
              @create="addNewLabel"
            />
            <div v-if="attendee.labels.length" class="flex flex-wrap gap-1.5">
              <UiLabelChip
                v-for="label in attendee.labels"
                :key="label.id"
                :label="label"
              />
            </div>
            <p class="text-xs leading-relaxed text-subtle">
              For this event only. Organizers and volunteers see labels;
              attendees never&nbsp;do.
            </p>
          </div>
        </section>

        <section v-if="attendee.hasEmail">
          <h3 class="pb-3 text-sm font-medium text-ink">Community Activity</h3>
          <div
            class="flex items-center justify-between border-b border-line px-4 py-3"
          >
            <span class="text-sm text-subtle">Events Attended</span>
            <span class="text-sm font-bold text-ink">{{
              attendee.eventsAttended
            }}</span>
          </div>
          <div class="flex items-center justify-between px-4 py-3">
            <span class="text-sm text-subtle">Connections Made</span>
            <span class="text-sm font-bold text-ink">{{
              attendee.connectionsMade
            }}</span>
          </div>
        </section>
      </div>
    </template>

    <template v-if="attendee?.hasEmail" #footer>
      <div class="flex w-full justify-end">
        <UButton
          label="View Persona Card"
          leading-icon="i-lucide-eye"
          color="neutral"
          :to="personaCardUrl"
          :target="personaCardUrl ? '_blank' : undefined"
          class="h-10 cursor-pointer justify-center rounded-full bg-ink pr-6 pl-5 text-sm font-medium text-ink-inverse hover:bg-ink/90"
          @click="onViewPersona"
        />
      </div>
    </template>
  </USlideover>
</template>
