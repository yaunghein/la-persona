<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

import type {
  CommunityJoinPolicy,
  CommunitySettingsFormValues,
} from '~~/shared/types/community-settings';

const toast = useToast();

const PLACEHOLDER_IMAGE = '/images/favicon.png';

const joinOptions: { label: string; value: CommunityJoinPolicy }[] = [
  { label: 'Anyone', value: 'anyone' },
  { label: 'Invite only', value: 'invite_only' },
  { label: 'Approval required', value: 'approval_required' },
];

/** Mock until community settings API exists. */
const initialForm = (): CommunitySettingsFormValues => ({
  name: 'Tech Leaders Myanmar',
  description:
    'A community connecting founders, investors and professionals through curated networking events.',
  coverImageUrl: '',
  logoUrl: PLACEHOLDER_IMAGE,
  whoCanJoin: 'anyone',
  notifyNewMember: true,
  notifyMembershipRequests: true,
  notifyEventRegistrations: true,
});

const form = ref<CommunitySettingsFormValues>(initialForm());
const snapshot = ref<CommunitySettingsFormValues>(initialForm());

function onCancel() {
  form.value = { ...snapshot.value };
  toast.add({
    title: 'Changes discarded',
    description: 'Settings restored to the last saved mock state.',
    color: 'neutral',
  });
}

function onSubmit() {
  if (!form.value.name.trim()) {
    toast.add({
      title: 'Name required',
      description: 'Organization name cannot be empty.',
      color: 'warning',
    });
    return;
  }

  snapshot.value = { ...form.value };
  toast.add({
    title: 'Settings updated',
    description: 'Mock save — community settings API is not wired yet.',
    color: 'success',
  });
}

function onDelete() {
  toast.add({
    title: 'Delete community',
    description: 'Mock action — deletion is not wired yet.',
    color: 'warning',
  });
}
</script>

<template>
  <CommunitySettingsForm
    v-model="form"
    :join-options="joinOptions"
    @submit="onSubmit"
    @cancel="onCancel"
    @delete="onDelete"
  />
</template>
