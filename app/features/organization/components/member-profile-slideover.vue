<script setup lang="ts">
import type { CommunityMember } from '~~/shared/contracts/organization';
import {
  formatCommunityRole,
  type CommunityInviteRole,
} from '~~/shared/permissions/organization';
import { formatDateLabel } from '~~/shared/utils/datetime';

const props = defineProps<{
  member: CommunityMember | null;
}>();

const emit = defineEmits<{
  remove: [member: CommunityMember];
  approve: [member: CommunityMember];
  reject: [member: CommunityMember];
  changeRole: [member: CommunityMember, role: CommunityInviteRole];
}>();

const roleOptions: { label: string; value: CommunityInviteRole }[] = [
  { label: 'Member', value: 'member' },
  { label: 'Volunteer', value: 'volunteer' },
];

// Admins are managed in Thakhin; only member ↔ volunteer is editable here.
const editableRole = computed<CommunityInviteRole | null>(() => {
  const role = props.member?.memberRole;
  return role === 'member' || role === 'volunteer' ? role : null;
});

function onChangeRole(role: CommunityInviteRole) {
  if (!props.member || role === editableRole.value) return;
  emit('changeRole', props.member, role);
}

const open = defineModel<boolean>('open', { default: false });
const toast = useToast();

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

  return resolveObjectStorageUrl(raw);
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
    {
      label: 'Invited As',
      value: formatCommunityRole(props.member.memberRole),
    },
    { label: 'Submitted', value: formatDateLabel(props.member.joinedAt) },
  ];
});

const personaCardUrl = computed(() =>
  props.member?.cardSlug ? `/c/${props.member.cardSlug}` : undefined
);

function onRemove() {
  if (!props.member) return;
  emit('remove', props.member);
}

function onReject() {
  if (!props.member) return;
  emit('reject', props.member);
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
      header: 'border-b-2 border-raised px-6 py-6',
      title: 'text-sm font-medium tracking-[1.4px] text-ink uppercase',
      body: 'px-6',
    }"
  >
    <template v-if="member" #body>
      <div v-if="isPending" class="flex flex-col py-2">
        <div
          v-for="(field, index) in pendingFields"
          :key="field.label"
          class="flex items-start justify-between gap-6 py-3"
          :class="
            index < pendingFields.length - 1 ? 'border-b border-raised' : ''
          "
        >
          <span class="shrink-0 text-sm text-subtle">{{ field.label }}</span>
          <span class="text-right text-sm break-all text-ink">{{
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
              root: 'size-20 bg-raised',
              icon: 'size-8 text-subtle',
            }"
          />
          <div class="space-y-1">
            <h2 class="text-lg font-medium tracking-widest uppercase text-ink">
              {{ member.name }}
            </h2>
            <p
              v-if="member.role || member.company"
              class="flex items-center justify-center gap-x-2 text-sm text-subtle"
            >
              <span v-if="member.role">{{ member.role }}</span>
              <span v-if="member.role && member.company">•</span>
              <span v-if="member.company">{{ member.company }}</span>
            </p>
            <p v-if="member.email" class="text-sm text-subtle">
              {{ member.email }}
            </p>
          </div>
        </div>

        <div>
          <div
            class="flex items-center justify-between border-b border-raised py-3"
          >
            <span class="text-sm text-subtle">Membership Status</span>
            <span class="text-sm text-ink">{{ membershipStatusLabel }}</span>
          </div>
          <div
            class="flex items-center justify-between gap-6 border-b border-raised py-3"
          >
            <span class="text-sm text-subtle">Community Role</span>
            <USelect
              v-if="editableRole"
              :model-value="editableRole"
              :items="roleOptions"
              size="sm"
              class="w-36"
              :ui="{
                base: 'rounded-[4px] border-line bg-raised text-ink',
              }"
              @update:model-value="onChangeRole"
            />
            <span v-else class="text-sm text-ink">{{
              formatCommunityRole(member.memberRole)
            }}</span>
          </div>
          <div class="flex items-center justify-between py-3">
            <span class="text-sm text-subtle">Joined</span>
            <span class="text-sm text-ink">{{
              formatDateLabel(member.joinedAt)
            }}</span>
          </div>
        </div>

        <section>
          <h3 class="pb-2 text-sm font-medium text-ink">Community Activity</h3>
          <div
            class="flex items-center justify-between border-b border-raised py-3"
          >
            <span class="text-sm text-subtle">Events Attended</span>
            <span class="text-sm text-ink">{{ member.eventsAttended }}</span>
          </div>
          <div class="flex items-center justify-between py-3">
            <span class="text-sm text-subtle">Connections Made</span>
            <span class="text-sm text-ink">{{ member.connections }}</span>
          </div>
        </section>
      </div>
    </template>

    <template v-if="member" #footer>
      <div v-if="isPending" class="flex items-center justify-end gap-2">
        <UButton
          label="Cancel"
          leading-icon="i-lucide-x"
          color="neutral"
          :ui="{ leadingIcon: 'size-4' }"
          class="h-10 cursor-pointer justify-center rounded-full bg-raised pr-6 pl-5 text-sm font-medium text-ink hover:bg-line"
          @click="onReject"
        />
      </div>
      <div v-else class="flex items-center justify-end gap-2">
        <UButton
          label="Remove"
          leading-icon="i-lucide-user-minus"
          color="error"
          variant="soft"
          class="h-10 cursor-pointer justify-center rounded-full pr-6 pl-5 text-sm font-medium"
          @click="onRemove"
        />
        <UButton
          label="View Persona Card"
          leading-icon="i-lucide-eye"
          color="neutral"
          :to="personaCardUrl"
          :target="personaCardUrl ? '_blank' : undefined"
          :ui="{ leadingIcon: 'size-4' }"
          class="h-10 cursor-pointer justify-center rounded-full bg-ink pr-6 pl-5 text-sm font-medium text-ink-inverse hover:bg-ink/90"
          @click="onViewPersona"
        />
      </div>
    </template>
  </USlideover>
</template>
