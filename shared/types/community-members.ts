export type CommunityMemberStatus = 'active' | 'pending';

export type CommunityMember = {
  id: string;
  kind: 'member' | 'invitation';
  name: string;
  role: string;
  company: string;
  connections: number;
  eventsAttended: number;
  status: CommunityMemberStatus;
  email?: string | null;
  joinedAt: string;
  avatarUrl?: string | null;
  cardSlug?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  linkedin?: string | null;
};

export type CommunityJoinPreview = {
  token: string;
  organizationName: string;
  organizationSlug: string;
  logoUrl: string | null;
  alreadyMember: boolean;
};

export type CommunityInvitationPreview = {
  id: string;
  email: string;
  organizationName: string;
  organizationSlug: string;
  logoUrl: string | null;
  alreadyMember: boolean;
  expired: boolean;
  status: string;
};

export type CommunityJoinResult = {
  organizationSlug: string;
  redirectTo: string;
};

export type CommunityMembersTab = 'all' | 'active' | 'pending';

export type CommunityMembersFilterOption = {
  label: string;
  value: string;
};

export type CommunityMembersData = {
  title: string;
  searchPlaceholder: string;
  inviteLink: string;
  statusOptions: CommunityMembersFilterOption[];
  participationOptions: CommunityMembersFilterOption[];
  infoItems: {
    icon: string;
    title: string;
    description: string;
  }[];
  members: CommunityMember[];
};
