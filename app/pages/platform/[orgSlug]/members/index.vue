<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

import { useQuery } from '@tanstack/vue-query';
import type {
  CommunityMember,
  CommunityMembersData,
} from '~~/shared/types/community-members';

const toast = useToast();
const route = useRoute();
const orgSlug = computed(() => String(route.params.orgSlug || ''));
const isInviteOpen = ref(false);

const { data: cards } = useQuery<CardDTO[]>({
  queryKey: ['cards', orgSlug],
  queryFn: () =>
    $fetch('/api/cards', {
      query: { organizationSlug: orgSlug.value },
    }),
});

function cardDisplayName(card: CardDTO) {
  return [card.firstName, card.lastName].filter(Boolean).join(' ').trim();
}

/** Mock until community members API / schema exists. */
const mockMembers: CommunityMember[] = [
  {
    id: '1',
    name: 'Aye Min Thura',
    role: 'Founder',
    company: 'Wave Ventures',
    connections: 42,
    eventsAttended: 8,
    status: 'active',
    email: 'thura@waveventures.co',
    joinedAt: 'Jan 12, 2026',
  },
  {
    id: '2',
    name: 'May Zin Oo',
    role: 'Strategy Consultant',
    company: 'Deloitte Myanmar',
    connections: 18,
    eventsAttended: 5,
    status: 'active',
    email: 'may@deloitte.com',
    joinedAt: 'Feb 03, 2026',
  },
  {
    id: '3',
    name: 'Ethan Wong',
    role: 'Product Manager',
    company: 'Nexus Labs',
    connections: 67,
    eventsAttended: 12,
    status: 'active',
    email: 'ethan@nexuslabs.io',
    joinedAt: 'Dec 20, 2025',
  },
  {
    id: '4',
    name: 'Su Su Hlaing',
    firstName: 'Su Su',
    lastName: 'Hlaing',
    role: 'UX Designer',
    company: 'Freelance',
    connections: 0,
    eventsAttended: 0,
    status: 'pending',
    email: 'susu@design.mm',
    phone: '+95 9 456 789 012',
    linkedin: 'https://linkedin.com/in/susuhlaing',
    joinedAt: 'Jan 08, 2026',
  },
  {
    id: '5',
    name: 'Ko Ko Aung',
    role: 'Community Lead',
    company: 'Yangon Tech Hub',
    connections: 31,
    eventsAttended: 9,
    status: 'active',
    email: 'aung@yangontechhub.com',
    joinedAt: 'Nov 01, 2025',
  },
  {
    id: '6',
    name: 'Hnin Ei Phyu',
    role: 'Marketing Manager',
    company: 'Wave Ventures',
    connections: 24,
    eventsAttended: 4,
    status: 'active',
    email: 'hnin@waveventures.co',
    joinedAt: 'Mar 12, 2026',
  },
  {
    id: '7',
    name: 'James Chen',
    role: 'Investor',
    company: 'Horizon Capital',
    connections: 55,
    eventsAttended: 7,
    status: 'active',
    email: 'james@horizon.capital',
    joinedAt: 'Oct 18, 2025',
  },
  {
    id: '8',
    name: 'Thiri Kyaw',
    firstName: 'Thiri',
    lastName: 'Kyaw',
    role: 'Operations',
    company: 'Nexus Labs',
    connections: 9,
    eventsAttended: 2,
    status: 'pending',
    email: 'thiri@nexuslabs.io',
    phone: '+95 9 567 890 123',
    linkedin: 'https://linkedin.com/in/thirikyaw',
    joinedAt: 'Apr 02, 2026',
  },
];

const membersMock = computed<CommunityMembersData>(() => {
  const orgCards = cards.value ?? [];
  const members = mockMembers.map((member, index) => {
    const matchedCard = orgCards.find(
      (item) =>
        cardDisplayName(item).toLowerCase() === member.name.toLowerCase()
    );
    const card = matchedCard || (index === 0 ? orgCards[0] : undefined);
    if (!card) return member;

    if (matchedCard) {
      return {
        ...member,
        role: card.position || member.role,
        company: card.company || member.company,
        email: card.email || member.email,
        avatarUrl: card.avatarUrl,
        cardSlug: card.slug,
      };
    }

    return {
      ...member,
      avatarUrl: card.avatarUrl,
      cardSlug: card.slug,
    };
  });

  return {
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
    members,
  };
});

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
