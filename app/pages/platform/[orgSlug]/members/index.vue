<script setup lang="ts">
import type {
  CommunityMember,
  CommunityMembersData,
} from '~~/shared/contracts/organization';
import type { CommunityInviteRole } from '~~/shared/permissions/organization';

definePageMeta({
  layout: 'platform',
});

const toast = useToast();
const { organizationSlug } = useOrganizationSlug();
const { data: members } = useCommunityMembersQuery(organizationSlug);
const { mutate: removeMember, isPending: isRemoving } =
  useRemoveMemberMutation(organizationSlug);
const { mutate: updateMemberRole } =
  useUpdateMemberRoleMutation(organizationSlug);
const { mutate: reviewInvitation } =
  useReviewInvitationMutation(organizationSlug);

const isInviteOpen = ref(false);
const memberToRemove = ref<CommunityMember | null>(null);
const isRemoveOpen = computed({
  get: () => memberToRemove.value !== null,
  set: (open) => {
    if (!open) memberToRemove.value = null;
  },
});

const membersData = computed<CommunityMembersData>(() => ({
  title: 'Members in Your Community',
  searchPlaceholder: 'Search members by name, keywords, or role',
  inviteLink: '',
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
  members: members.value ?? [],
}));

function showError(title: string, error: unknown) {
  toast.add({ title, description: apiErrorMessage(error), color: 'error' });
}

function confirmRemove() {
  const member = memberToRemove.value;
  if (!member) return;
  removeMember(member.id, {
    onSuccess: () => {
      memberToRemove.value = null;
      toast.add({
        title: 'Member removed',
        description:
          'Their community card, analytics, and event attendance in this community were removed. Their personal account was not.',
        color: 'success',
      });
    },
    onError: (error) => showError('Could not remove member', error),
  });
}

function changeMemberRole(member: CommunityMember, role: CommunityInviteRole) {
  updateMemberRole(
    { memberId: member.id, role },
    {
      onSuccess: () =>
        toast.add({
          title: 'Role updated',
          description: `${member.name} is now a ${role}.`,
          color: 'success',
        }),
      onError: (error) => showError('Could not update role', error),
    }
  );
}

function approveInvitation(member: CommunityMember) {
  reviewInvitation(
    { invitationId: member.id, status: 'accepted' },
    {
      onSuccess: (result) => {
        const added = result.status === 'member_added';
        toast.add({
          title: added ? 'Member added' : 'Invitation resent',
          description: added
            ? 'They now have a community card.'
            : 'They do not have an account yet, so the invite was sent again.',
          color: 'success',
        });
      },
      onError: (error) => showError('Could not approve', error),
    }
  );
}

function cancelInvitation(member: CommunityMember) {
  reviewInvitation(
    { invitationId: member.id, status: 'canceled' },
    {
      onSuccess: () =>
        toast.add({ title: 'Invitation cancelled', color: 'success' }),
      onError: (error) => showError('Could not cancel', error),
    }
  );
}

function openInvite() {
  isInviteOpen.value = true;
}

function askRemove(member: CommunityMember) {
  memberToRemove.value = member;
}

function exportMembers() {
  toast.add({
    title: 'Export coming soon',
    description: 'Member export is not wired yet.',
    color: 'neutral',
  });
}
</script>

<template>
  <OrganizationMembersList
    :data="membersData"
    @invite="openInvite"
    @export="exportMembers"
    @remove="askRemove"
    @approve="approveInvitation"
    @reject="cancelInvitation"
    @change-role="changeMemberRole"
  />
  <OrganizationInviteMembersSlideover
    v-model:open="isInviteOpen"
    :organization-slug="organizationSlug"
  />
  <UiConfirmDeleteModal
    v-model:open="isRemoveOpen"
    title="Remove member?"
    confirm-label="Remove"
    :pending="isRemoving"
    @confirm="confirmRemove"
  >
    This cannot be undone. Removing
    <span class="font-medium text-ink">{{ memberToRemove?.name }}</span>
    deletes their community card, its analytics and contact exchanges, and their
    event registrations in this community. Their LA PERSONA account and personal
    card stay.
  </UiConfirmDeleteModal>
</template>
