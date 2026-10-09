import { formatTimeLabel } from '~~/shared/utils/datetime';

export type CommunityEventDetailTab =
  | 'overview'
  | 'attendees'
  | 'check-in'
  | 'settings';

export type EventAttendeeStatus = 'pending' | 'registered' | 'checked_in';

/** Timestamps are UTC ISO strings; format them in the browser. */
export type EventAttendee = {
  id: string;
  name: string;
  role: string;
  company: string;
  status: EventAttendeeStatus;
  membershipStatus: string;
  joinedAt: string | null;
  registeredAt: string | null;
  checkedInAt: string | null;
  eventsAttended: number;
  connectionsMade: number;
  phone?: string;
  phoneCountryCode?: string | null;
  email?: string;
  avatarUrl?: string;
  cardSlug?: string;
  splineUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  position?: string | null;
  website?: string | null;
  planCode?: string | null;
};

export function attendeeStatusLabel(
  attendee: Pick<EventAttendee, 'status' | 'checkedInAt'>
) {
  if (attendee.status === 'checked_in') {
    return attendee.checkedInAt
      ? `Checked-in at ${formatTimeLabel(attendee.checkedInAt)}`
      : 'Checked-in';
  }
  if (attendee.status === 'pending') return 'Pending approval';
  return 'Registered';
}

export type EventDetailOverview = {
  dateTime: string;
  place: string;
  registrationStatus: 'open' | 'closed' | 'invite_only';
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
