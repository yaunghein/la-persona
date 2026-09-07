<script setup lang="ts">
import type { EventAttendee } from '~~/shared/types/community-event-detail';

defineOptions({ name: 'CommunityEventAttendeeProfileSlideover' });

const props = defineProps<{
  attendee: EventAttendee | null;
}>();

const open = defineModel<boolean>('open', { default: false });

const toast = useToast();
const runtimeConfig = useRuntimeConfig();

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

  const bucket = runtimeConfig.public.awsBucketName;
  const region = runtimeConfig.public.awsRegion;
  if (!bucket || !region) return raw;

  return `https://${bucket}.s3.${region}.amazonaws.com/${raw}`;
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
      content: 'bg-[#171717]',
      header: 'border-b-2 border-[#232323] px-6 py-6',
      title: 'text-sm font-medium tracking-[1.4px] text-white uppercase',
      body: 'px-6',
      footer: 'px-6 py-6 justify-end',
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
              root: 'size-24 bg-[#232323]',
              icon: 'size-10 text-[#8b8b8b]',
            }"
          />
          <div class="space-y-1">
            <h2
              class="text-xl font-medium tracking-[2px] uppercase text-white"
            >
              {{ attendee.name }}
            </h2>
            <p
              v-if="attendee.role || attendee.company"
              class="flex items-center justify-center gap-x-2 text-xs text-[#8b8b8b]"
            >
              <span v-if="attendee.role">{{ attendee.role }}</span>
              <span v-if="attendee.role && attendee.company">·</span>
              <span v-if="attendee.company">{{ attendee.company }}</span>
            </p>
            <p v-if="attendee.email" class="text-xs text-[#8b8b8b]">
              {{ attendee.email }}
            </p>
          </div>
        </div>

        <div>
          <div
            class="flex items-center justify-between border-b border-[#2a2a2a] px-4 py-3"
          >
            <span class="text-sm text-[#8b8b8b]">Membership Status</span>
            <span class="text-sm font-bold text-white">{{
              attendee.membershipStatus
            }}</span>
          </div>
          <div class="flex items-center justify-between px-4 py-3">
            <span class="text-sm text-[#8b8b8b]">Joined</span>
            <span class="text-sm font-bold text-white">{{
              attendee.joinedAt
            }}</span>
          </div>
        </div>

        <section>
          <h3 class="pb-3 text-sm font-medium text-white">Event Registration</h3>
          <div
            class="flex items-center justify-between border-b border-[#2a2a2a] px-4 py-3"
          >
            <span class="text-sm text-[#8b8b8b]">Registered</span>
            <span class="text-sm font-bold text-white">{{
              attendee.registeredAt
            }}</span>
          </div>
          <div class="flex items-center justify-between px-4 py-3">
            <span class="text-sm text-[#8b8b8b]">Checked In</span>
            <span class="text-sm font-bold text-white">
              {{ attendee.checkedInAt ?? '—' }}
            </span>
          </div>
        </section>

        <section>
          <h3 class="pb-3 text-sm font-medium text-white">Community Activity</h3>
          <div
            class="flex items-center justify-between border-b border-[#2a2a2a] px-4 py-3"
          >
            <span class="text-sm text-[#8b8b8b]">Events Attended</span>
            <span class="text-sm font-bold text-white">{{
              attendee.eventsAttended
            }}</span>
          </div>
          <div class="flex items-center justify-between px-4 py-3">
            <span class="text-sm text-[#8b8b8b]">Connections Made</span>
            <span class="text-sm font-bold text-white">{{
              attendee.connectionsMade
            }}</span>
          </div>
        </section>
      </div>
    </template>

    <template v-if="attendee" #footer>
      <div class="flex w-full justify-end">
        <UButton
          label="View Persona Card"
          leading-icon="i-lucide-eye"
          color="neutral"
          :to="personaCardUrl"
          :target="personaCardUrl ? '_blank' : undefined"
          :ui="{ leadingIcon: 'size-5' }"
          class="h-9 cursor-pointer justify-center rounded-full bg-white py-2 pr-6 pl-5 text-sm font-medium text-dark hover:bg-white/90"
          @click="onViewPersona"
        />
      </div>
    </template>
  </USlideover>
</template>
