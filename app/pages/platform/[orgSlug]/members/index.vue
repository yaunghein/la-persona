<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

import type { CommunityMembersData } from '~~/shared/types/community-members';

const toast = useToast();
const route = useRoute();
const orgSlug = computed(() => String(route.params.orgSlug || ''));
const isInviteOpen = ref(false);

/** Mock until community members API / schema exists. */
const membersMock = computed<CommunityMembersData>(() => ({
  title: 'Members in Your Community',
  searchPlaceholder: 'Search members by name, keywords, or role',
  inviteLink: `https://lapersona.app/invite/${orgSlug.value || 'TLM-8F24'}`,
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
  members: [
    {
      id: '1',
      name: 'Aye Min Thura',
      role: 'Founder',
      company: 'Wave Ventures',
      connections: 42,
      eventsAttended: 8,
      status: 'active',
    },
    {
      id: '2',
      name: 'May Zin Oo',
      role: 'Strategy Consultant',
      company: 'Deloitte Myanmar',
      connections: 18,
      eventsAttended: 5,
      status: 'active',
    },
    {
      id: '3',
      name: 'Ethan Wong',
      role: 'Product Manager',
      company: 'Nexus Labs',
      connections: 67,
      eventsAttended: 12,
      status: 'active',
    },
    {
      id: '4',
      name: 'Su Su Hlaing',
      role: 'UX Designer',
      company: 'Freelance',
      connections: 0,
      eventsAttended: 0,
      status: 'pending',
    },
    {
      id: '5',
      name: 'Ko Ko Aung',
      role: 'Community Lead',
      company: 'Yangon Tech Hub',
      connections: 31,
      eventsAttended: 9,
      status: 'active',
    },
    {
      id: '6',
      name: 'Hnin Ei Phyu',
      role: 'Marketing Manager',
      company: 'Wave Ventures',
      connections: 24,
      eventsAttended: 4,
      status: 'active',
    },
    {
      id: '7',
      name: 'James Chen',
      role: 'Investor',
      company: 'Horizon Capital',
      connections: 55,
      eventsAttended: 7,
      status: 'active',
    },
    {
      id: '8',
      name: 'Thiri Kyaw',
      role: 'Operations',
      company: 'Nexus Labs',
      connections: 9,
      eventsAttended: 2,
      status: 'pending',
    },
  ],
}));

function onExport() {
  toast.add({
    title: 'Export coming soon',
    description: 'Member export is not wired yet.',
    color: 'neutral',
  });
}
</script>

<template>
  <CommunityMembersList
    :data="membersMock"
    @invite="isInviteOpen = true"
    @export="onExport"
  />
  <CommunityInviteMembersSlideover
    v-model:open="isInviteOpen"
    :invite-link="membersMock.inviteLink"
  />
</template>
