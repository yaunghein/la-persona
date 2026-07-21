export type CommunityEventDetailTab =
  | 'overview'
  | 'attendees'
  | 'check-in'
  | 'settings';

export type EventAttendeeStatus = 'registered' | 'checked_in';

export type EventAttendee = {
  id: string;
  name: string;
  role: string;
  company: string;
  status: EventAttendeeStatus;
  statusLabel: string;
  membershipStatus: string;
  joinedAt: string;
  registeredAt: string;
  checkedInAt: string | null;
  eventsAttended: number;
  connectionsMade: number;
  phone?: string;
  email?: string;
};

export type EventDetailOverview = {
  dateTime: string;
  place: string;
  registrationStatus: 'open' | 'closed';
  registrations: number;
  checkedIn: number;
  attendanceRate: string;
  newMembersJoined: number;
  registrationTrend: {
    labels: string[];
    values: number[];
  };
};

export type EventDetailSettings = {
  title: string;
  date: string;
  location: string;
  registration: 'open' | 'closed' | 'invite_only';
  approval: 'everyone' | 'manual';
};

export type CommunityEventDetailData = {
  id: string;
  title: string;
  status: 'upcoming' | 'past';
  overview: EventDetailOverview;
  attendees: EventAttendee[];
  settings: EventDetailSettings;
};
