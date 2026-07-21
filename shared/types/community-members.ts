export type CommunityMemberStatus = 'active' | 'pending';

export type CommunityMember = {
  id: string;
  name: string;
  role: string;
  company: string;
  connections: number;
  eventsAttended: number;
  status: CommunityMemberStatus;
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
