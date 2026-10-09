<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { QUERY_KEYS } from '~/utils/query-keys';
import type {
  CommunityMember,
  CommunityMembersData,
} from '~~/shared/types/community-members';
const toast = useToast();
const queryClient = useQueryClient();
const { organizationSlug, withOrganizationQuery } = useOrganizationSlug();
const isInviteOpen = ref(false);
const memberToRemove = ref<CommunityMember | null>(null);
const isRemoveOpen = ref(false);

const { data } = useQuery<{
  inviteLink: string;
  members: CommunityMember[];
}>({
  queryKey: computed(() => [
    ...QUERY_KEYS.communityMembers,
    organizationSlug.value,
  ]),
  queryFn: () =>
    $fetch('/api/community-members', {
      query: withOrganizationQuery(),
    }),
  enabled: () => !!organizationSlug.value,
});

const membersData = computed<CommunityMembersData>(() => ({
  title: 'Members in Your Community',
  searchPlaceholder: 'Search members by name, keywords, or role',
  inviteLink: data.value?.inviteLink || '',
  statusOptions: [
    { label: 'Status', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Pending', value: 'pending' },
  ],
  participationOptions: [
    { label: 'Participation', value: 'all' },
    { label: 'Attended events', value: 'attended' },
    { label: 'No events yet', value: 'none' },
  ],
  infoItems: [
    {
      icon: 'i-lucide-user-plus',
      title: 'Invite people',
      description:
        'Share a link, send email invites, or display a QR code at events.',
    },
    {
      icon: 'i-lucide-filter',
      title: 'Filter membership',
      description: 'Find members by status, participation, role, or company.',
    },
    {
      icon: 'i-lucide-activity',
      title: 'Track engagement',
      description:
        'See connections and event attendance across your community.',
    },
  ],
  members: data.value?.members ?? [],
}));

function invalidateMembers() {
  return queryClient.invalidateQueries({
    queryKey: [...QUERY_KEYS.communityMembers, organizationSlug.value],
  });
}

const { mutate: removeMember, isPending: isRemoving } = useMutation({
  mutationFn: (member: CommunityMember) =>
    $fetch(`/api/community-members/${member.id}`, {
      method: 'DELETE',
      query: withOrganizationQuery(),
    }),
  onSuccess: async () => {
    isRemoveOpen.value = false;
    memberToRemove.value = null;
    await invalidateMembers();
    toast.add({
      title: 'Member removed',
      description:
        'Their community card, analytics, and event attendance in this community were removed. Their personal account was not.',
      color: 'success',
    });
  },
  onError: (error: { data?: { statusMessage?: string }; message?: string }) => {
    toast.add({
      title: 'Could not remove member',
      description:
        error.data?.statusMessage || error.message || 'Please try again.',
      color: 'error',
    });
  },
});

const { mutate: approveInvitation } = useMutation({
  mutationFn: (member: CommunityMember) =>
    $fetch(`/api/community-members/invitations/${member.id}/approve`, {
      method: 'POST',
      query: withOrganizationQuery(),
    }),
  onSuccess: async (result: { added?: boolean; resent?: boolean }) => {
    await invalidateMembers();
    toast.add({
      title: result.added ? 'Member added' : 'Invitation resent',
      description: result.added
        ? 'They now have a community card.'
        : 'They do not have an account yet, so the invite was sent again.',
      color: 'success',
    });
  },
  onError: (error: { data?: { statusMessage?: string }; message?: string }) => {
    toast.add({
      title: 'Could not approve',
      description:
        error.data?.statusMessage || error.message || 'Please try again.',
      color: 'error',
    });
  },
});

const { mutate: rejectInvitation } = useMutation({
  mutationFn: (member: CommunityMember) =>
    $fetch(`/api/community-members/invitations/${member.id}/cancel`, {
      method: 'POST',
      query: withOrganizationQuery(),
    }),
  onSuccess: async () => {
    await invalidateMembers();
    toast.add({
      title: 'Invitation cancelled',
      color: 'success',
    });
  },
  onError: (error: { data?: { statusMessage?: string }; message?: string }) => {
    toast.add({
      title: 'Could not cancel',
      description:
        error.data?.statusMessage || error.message || 'Please try again.',
      color: 'error',
    });
  },
});

function onExport() {
  toast.add({
    title: 'Export coming soon',
    description: 'Member export is not wired yet.',
    color: 'neutral',
  });
}

function onAskRemove(member: CommunityMember) {
  memberToRemove.value = member;
  isRemoveOpen.value = true;
}

function confirmRemove() {
  if (!memberToRemove.value) return;
  removeMember(memberToRemove.value);
}
</script>

<template>
  <CommunityMembersList
    :data="membersData"
    @invite="isInviteOpen = true"
    @export="onExport"
    @remove="onAskRemove"
    @approve="approveInvitation"
    @reject="rejectInvitation"
  />
  <CommunityInviteMembersSlideover
    v-model:open="isInviteOpen"
    :invite-link="membersData.inviteLink"
    @sent="invalidateMembers"
  />
  <UModal
    v-model:open="isRemoveOpen"
    :close="false"
    :dismissible="!isRemoving"
    title="Remove member?"
    :ui="{
      content: 'bg-[#171717] max-w-md',
      title: 'text-white',
      body: 'pt-4',
      footer: 'justify-end gap-2',
    }"
  >
    <template #body>
      <p class="text-sm leading-relaxed text-[#bcbcbc]">
        This cannot be undone. Removing
        <span class="font-medium text-white">
          {{ memberToRemove?.name }}
        </span>
        deletes their community card, its analytics and contact exchanges, and
        their event registrations in this community. Their LA PERSONA account
        and personal card stay.
      </p>
    </template>
    <template #footer>
      <UButton
        label="Cancel"
        color="neutral"
        variant="ghost"
        class="rounded-full px-5"
        :disabled="isRemoving"
        @click="isRemoveOpen = false"
      />
      <UButton
        label="Remove"
        color="error"
        class="rounded-full px-6 font-medium"
        :loading="isRemoving"
        @click="confirmRemove"
      />
    </template>
  </UModal>
</template>
