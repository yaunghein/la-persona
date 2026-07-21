export type CommunityJoinPolicy = 'anyone' | 'invite_only' | 'approval_required';

export type CommunitySettingsFormValues = {
  name: string;
  description: string;
  coverImageUrl: string;
  logoUrl: string;
  whoCanJoin: CommunityJoinPolicy;
  notifyNewMember: boolean;
  notifyMembershipRequests: boolean;
  notifyEventRegistrations: boolean;
};

export type CommunitySettingsData = {
  title: string;
  joinOptions: { label: string; value: CommunityJoinPolicy }[];
  form: CommunitySettingsFormValues;
};
