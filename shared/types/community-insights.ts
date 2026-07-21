export type CommunityMetric = {
  label: string;
  value: string;
};

export type CommunityEventPerformance = {
  id: string;
  event: string;
  registered: number;
  checkedIn: number;
  attendance: string;
};

export type CommunityMemberGrowth = {
  labels: string[];
  values: number[];
};

export type CommunityInsightsData = {
  title: string;
  periodOptions: { label: string; value: string }[];
  metrics: CommunityMetric[];
  memberGrowth: CommunityMemberGrowth;
  eventPerformance: CommunityEventPerformance[];
  infoItems: {
    icon: string;
    title: string;
    description: string;
  }[];
};
