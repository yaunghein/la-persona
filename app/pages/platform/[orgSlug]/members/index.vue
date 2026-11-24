<script setup lang="ts">
import { format } from 'date-fns';
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
const { data: userOrgs } = useUserOrganizations();
const isCompany = computed(
  () =>
    userOrgs.value?.find((org) => org.slug === organizationSlug.value)?.type ===
    'company'
);
const { data: members } = useCommunityMembersQuery(organizationSlug, {
  enabled: () => !isCompany.value,
});
const { mutate: removeMember, isPending: isRemoving } =
  useRemoveMemberMutation(organizationSlug);
const { mutate: updateMemberRole } =
  useUpdateMemberRoleMutation(organizationSlug);
const { mutate: reviewInvitation } =
  useReviewInvitationMutation(organizationSlug);
const { mutate: inviteMember } = useInviteMemberMutation(organizationSlug);

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
          'Their community card link and event registrations here were removed. Contacts collected on the card were kept.',
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

function resendInvitation(member: CommunityMember) {
  if (member.memberRole === 'admin' || !member.email) return;
  inviteMember(
    { email: member.email, role: member.memberRole },
    {
      onSuccess: () =>
        toast.add({
          title: 'Invite sent again',
          description: `A new invitation email went to ${member.email}.`,
          color: 'success',
        }),
      onError: (error) => showError('Could not resend', error),
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

async function exportMembers() {
  if (!members.value?.length) {
    toast.add({
      title: 'Nothing to export',
      description: 'No members available.',
      color: 'warning',
    });
    return;
  }
  try {
    const blob = await downloadMembersCsv(organizationSlug.value);
    downloadFile({
      blob,
      fileName: `members-${organizationSlug.value}-${format(new Date(), 'yyyy-MM-dd')}.csv`,
    });
  } catch (error) {
    showError('Export failed', error);
  }
}
</script>

<template>
  <OrganizationCompanyMembers
    v-if="isCompany"
    :organization-slug="organizationSlug"
  />
  <OrganizationMembersList
    v-else
    :data="membersData"
    @invite="openInvite"
    @export="exportMembers"
    @remove="askRemove"
    @resend="resendInvitation"
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
    Removing
    <span class="font-medium text-ink">{{ memberToRemove?.name }}</span>
    retires their community card's link and deletes their event registrations in
    this community. The contacts collected on that card stay with you and with
    them. Their LA PERSONA account and personal card&nbsp;stay.
  </UiConfirmDeleteModal>
</template>
