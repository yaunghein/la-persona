<script setup lang="ts">
import type { CommunityMember } from '~~/shared/types/community-members';

const props = defineProps<{
  member: CommunityMember | null;
}>();

const open = defineModel<boolean>('open', { default: false });

const toast = useToast();
const runtimeConfig = useRuntimeConfig();

const displayAvatar = computed(() => {
  const raw = String(props.member?.avatarUrl || '').trim();
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

const membershipStatusLabel = computed(() =>
  props.member?.status === 'active' ? 'Active' : 'Pending'
);

const isPending = computed(() => props.member?.status === 'pending');

const pendingFields = computed(() => {
  if (!props.member) return [];

  const nameParts = props.member.name.trim().split(/\s+/);
  const firstName =
    props.member.firstName ||
    (nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : nameParts[0]);
  const lastName =
    props.member.lastName || (nameParts.length > 1 ? nameParts.at(-1) : '');

  return [
    { label: 'First Name', value: firstName },
    { label: 'Last Name', value: lastName },
    { label: 'Professional Title/ Role', value: props.member.role },
    { label: 'Phone Number', value: props.member.phone },
    { label: 'Email', value: props.member.email },
    { label: 'LinkedIn', value: props.member.linkedin },
    { label: 'Submitted', value: props.member.joinedAt },
  ];
});

const personaCardUrl = computed(() =>
  props.member?.cardSlug ? `/c/${props.member.cardSlug}` : undefined
);

function onRemove() {
  toast.add({
    title: 'Remove member',
    description: 'Removal is not wired yet.',
    color: 'warning',
  });
}

function onReject() {
  toast.add({
    title: 'Reject member',
    description: 'Pending member rejection is not wired yet.',
    color: 'warning',
  });
}

function onApprove() {
  toast.add({
    title: 'Approve member',
    description: 'Pending member approval is not wired yet.',
    color: 'success',
  });
}

function onViewPersona() {
  if (personaCardUrl.value) return;
  toast.add({
    title: 'Persona card',
    description: props.member
      ? `Opening persona card for ${props.member.name}.`
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
    :title="isPending ? 'PENDING MEMBER PROFILE' : 'MEMBER PROFILE'"
    :ui="{
      header: 'border-b-2 border-[#232323] px-6 py-6',
      title: 'text-sm font-medium tracking-[1.4px] text-white uppercase',
      body: 'px-6',
      footer: 'border-t border-[#232323] px-6 py-6 justify-end',
    }"
  >
    <template v-if="member" #body>
      <div v-if="isPending" class="flex flex-col py-2">
        <div
          v-for="(field, index) in pendingFields"
          :key="field.label"
          class="flex items-start justify-between gap-6 py-3"
          :class="
            index < pendingFields.length - 1 ? 'border-b border-[#232323]' : ''
          "
        >
          <span class="shrink-0 text-sm text-[#8b8b8b]">{{ field.label }}</span>
          <span class="text-right text-sm break-all text-white">{{
            field.value || '—'
          }}</span>
        </div>
      </div>

      <div v-else class="flex flex-col gap-8 py-2">
        <div class="flex flex-col items-center gap-4 pt-2 text-center">
          <UAvatar
            :src="displayAvatar || undefined"
            :alt="member.name"
            icon="i-lucide-user"
            :ui="{
              root: 'size-20 bg-[#232323]',
              icon: 'size-8 text-[#8b8b8b]',
            }"
          />
          <div class="space-y-1">
            <h2
              class="text-lg font-medium tracking-widest uppercase text-white"
            >
              {{ member.name }}
            </h2>
            <p
              v-if="member.role || member.company"
              class="flex items-center justify-center gap-x-2 text-sm text-[#8b8b8b]"
            >
              <span v-if="member.role">{{ member.role }}</span>
              <span v-if="member.role && member.company">•</span>
              <span v-if="member.company">{{ member.company }}</span>
            </p>
            <p v-if="member.email" class="text-sm text-[#8b8b8b]">
              {{ member.email }}
            </p>
          </div>
        </div>

        <div>
          <div
            class="flex items-center justify-between border-b border-[#232323] py-3"
          >
            <span class="text-sm text-[#8b8b8b]">Membership Status</span>
            <span class="text-sm text-white">{{ membershipStatusLabel }}</span>
          </div>
          <div class="flex items-center justify-between py-3">
            <span class="text-sm text-[#8b8b8b]">Joined</span>
            <span class="text-sm text-white">{{ member.joinedAt }}</span>
          </div>
        </div>

        <section>
          <h3 class="pb-2 text-sm font-medium text-white">
            Community Activity
          </h3>
          <div
            class="flex items-center justify-between border-b border-[#232323] py-3"
          >
            <span class="text-sm text-[#8b8b8b]">Events Attended</span>
            <span class="text-sm text-white">{{ member.eventsAttended }}</span>
          </div>
          <div class="flex items-center justify-between py-3">
            <span class="text-sm text-[#8b8b8b]">Connections Made</span>
            <span class="text-sm text-white">{{ member.connections }}</span>
          </div>
        </section>
      </div>
    </template>

    <template v-if="member" #footer>
      <div v-if="isPending" class="flex items-center justify-end gap-2.5">
        <UButton
          label="Reject"
          leading-icon="i-lucide-x"
          color="neutral"
          :ui="{ leadingIcon: 'size-4' }"
          class="h-9 cursor-pointer justify-center rounded-full bg-[#232323] py-2 pr-6 pl-5 text-sm font-medium text-white hover:bg-[#2a2a2a]"
          @click="onReject"
        />
        <UButton
          label="Approve"
          leading-icon="i-lucide-check"
          color="neutral"
          :ui="{ leadingIcon: 'size-4' }"
          class="h-9 cursor-pointer justify-center rounded-full bg-green py-2 pr-6 pl-5 text-sm font-medium text-dark hover:bg-green/90"
          @click="onApprove"
        />
      </div>
      <div v-else class="flex items-center justify-end gap-4">
        <UButton
          label="Remove"
          color="neutral"
          variant="ghost"
          class="px-2 text-sm font-medium text-white hover:bg-transparent hover:text-white/80"
          @click="onRemove"
        />
        <UButton
          label="View Persona Card"
          leading-icon="i-lucide-eye"
          color="neutral"
          :to="personaCardUrl"
          :target="personaCardUrl ? '_blank' : undefined"
          :ui="{ leadingIcon: 'size-4' }"
          class="h-9 cursor-pointer justify-center rounded-full bg-white py-2 pr-6 pl-5 text-sm font-medium text-dark hover:bg-white/90"
          @click="onViewPersona"
        />
      </div>
    </template>
  </USlideover>
</template>
