export type CommunityEventStatus = 'upcoming' | 'past';

export type CommunityEventCategory =
  | 'networking'
  | 'workshop'
  | 'meetup'
  | 'conference'
  | 'other';

export type CommunityEventRegistration = 'open' | 'closed' | 'invite_only';

export type CommunityEventApproval = 'everyone' | 'manual';

export type CommunityEvent = {
  id: string;
  title: string;
  dateLabel: string;
  location: string;
  imageUrl: string;
  status: CommunityEventStatus;
  category: CommunityEventCategory;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  registration: CommunityEventRegistration;
  approval: CommunityEventApproval;
};

export type CommunityEventsFilterOption = {
  label: string;
  value: string;
};

export type CommunityEventsData = {
  title: string;
  searchPlaceholder: string;
  statusOptions: CommunityEventsFilterOption[];
  infoItems: {
    icon: string;
    title: string;
    description: string;
  }[];
  events: CommunityEvent[];
};

export type CommunityEventFormValues = {
  title: string;
  category: CommunityEventCategory;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  imageUrl: string;
  registration: CommunityEventRegistration;
  approval: CommunityEventApproval;
};
