import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { z } from 'zod';
import type { event } from '~~/server/db/schema';
import { formatTimeLabel } from '~~/shared/utils/datetime';
import {
  eventStatus,
  formatEventDateLabel,
  formatEventDateValue,
  formatEventTimeValue,
} from '~~/shared/utils/event-datetime';
import {
  EVENT_MAX_EXTRA_PHOTOS,
  isAllowedEventImageUrl,
} from '~~/shared/utils/event-media';
import { eventScheduleError, isTimeZone } from '~~/shared/utils/event-datetime';

export type SelectEvent = InferSelectModel<typeof event>;
export type InsertEvent = InferInsertModel<typeof event>;

export type EventDTO = Omit<
  SelectEvent,
  | 'startsAt'
  | 'endsAt'
  | 'reminderEmailSentAt'
  | 'afterEventEmailSentAt'
  | 'createdAt'
  | 'updatedAt'
> & {
  startsAt: string;
  endsAt: string;
  reminderEmailSentAt: string | null;
  afterEventEmailSentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EventOrganizer = {
  name: string;
  logoUrl?: string | null;
  slug?: string;
  cardSlug?: string | null;
};

export const EVENT_REGISTRATION_MODES = [
  'open',
  'closed',
  'invite_only',
] as const;
export type EventRegistrationMode = (typeof EVENT_REGISTRATION_MODES)[number];

export const EVENT_APPROVAL_MODES = ['everyone', 'manual'] as const;
export type EventApprovalMode = (typeof EVENT_APPROVAL_MODES)[number];

/** Emails an organizer sends to attendees from the event page. */
export const EVENT_BROADCAST_KINDS = ['reminder', 'after_event'] as const;
export type EventBroadcastKind = (typeof EVENT_BROADCAST_KINDS)[number];

export const EVENT_REGISTRATION_STATUSES = [
  'pending',
  'registered',
  'checked_in',
] as const;
export type EventRegistrationStatus =
  (typeof EVENT_REGISTRATION_STATUSES)[number];

export type ViewerRegistrationStatus = 'none' | EventRegistrationStatus;

export type PublicEventViewer = {
  isMember: boolean;
  cardSlug: string | null;
  cardComplete: boolean;
  viewerRegistrationStatus: ViewerRegistrationStatus;
};

export type PublicEventDTO = EventDTO & {
  organizer: EventOrganizer;
  registeredCount: number;
  viewer: PublicEventViewer | null;
};

export type EventListItemDTO = EventDTO & {
  registeredCount: number;
  viewerRegistrationStatus: ViewerRegistrationStatus;
};

export type AddToGoogleCalendarResult =
  | { status: 'added' | 'updated'; htmlLink: string | null }
  | { status: 'consent_required' };

export type EventOverviewStats = {
  registrations: number;
  checkedIn: number;
  attendanceRate: string;
  newMembersJoined: number;
  registrationTrend: {
    labels: string[];
    values: number[];
  };
};

export type EventDetailDTO = EventListItemDTO & {
  overview: EventOverviewStats;
};

const eventImageUrlSchema = z
  .string()
  .trim()
  .min(1, 'Image is required')
  .refine((url) => isAllowedEventImageUrl(url), {
    message: 'Invalid image URL',
  });

const eventBodyFields = {
  title: z.string().trim().min(1, 'Event name is required'),
  description: z.string().trim().optional().or(z.literal('')),
  location: z.string().trim().min(1, 'Location is required'),
  mapUrl: z
    .string()
    .trim()
    .pipe(
      z.union([
        z.literal(''),
        z.url({ protocol: /^https?$/, message: 'Enter a valid map link' }),
      ])
    )
    .optional(),
  startsAt: z.iso.datetime({ offset: true, message: 'Start time is required' }),
  endsAt: z.iso.datetime({ offset: true, message: 'End time is required' }),
  capacity: z.number().int().positive().nullable(),
  coverUrl: eventImageUrlSchema,
  photoUrls: z.array(eventImageUrlSchema).max(EVENT_MAX_EXTRA_PHOTOS),
  registrationMode: z.enum(EVENT_REGISTRATION_MODES).default('open'),
  approvalMode: z.enum(EVENT_APPROVAL_MODES).default('everyone'),
};

function withSchedule<
  T extends z.ZodType<{ startsAt: string; endsAt: string }>,
>(schema: T, allowPast: boolean) {
  return schema.superRefine((value, ctx) => {
    const message = eventScheduleError(
      new Date(value.startsAt),
      new Date(value.endsAt),
      { allowPast }
    );
    if (!message) return;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endsAt'],
      message,
    });
  });
}

/** The zone is set once, from the organizer's device; edits keep it. */
export const CreateEventRequest = withSchedule(
  z.object({
    ...eventBodyFields,
    timeZone: z
      .string()
      .refine(isTimeZone, { message: 'Enter a valid time zone' }),
  }),
  false
);

export type CreateEventRequest = z.infer<typeof CreateEventRequest>;

/** Same fields as create minus the zone; past dates are allowed when editing an existing event. */
export const UpdateEventRequest = withSchedule(z.object(eventBodyFields), true);

export type UpdateEventRequest = z.infer<typeof UpdateEventRequest>;

export const EventRouteParams = z.object({
  eventId: z.string().trim().min(1),
});

export const RegistrationRouteParams = z.object({
  registrationId: z.string().trim().min(1),
});

export const TicketRouteParams = EventRouteParams.extend({
  cardSlug: z.string().trim().min(1),
});

/** An organizer approves a registration that waits for manual approval. */
export const ReviewRegistrationRequest = z.object({
  status: z.literal('registered'),
});

/** Check-in scans the attendee's card QR; the client sends the card slug. */
export const CreateCheckInRequest = z.object({
  cardSlug: z.string().trim().min(1, 'QR code is required'),
});

export const CreateBroadcastRequest = z.object({
  kind: z.enum(EVENT_BROADCAST_KINDS),
});

export type EventCollection = {
  items: EventListItemDTO[];
  organizerCardSlug: string | null;
};

export type EventAttendeeCollection = { items: EventAttendee[] };

/** Result of looking up a scanned ticket before checking it in. */
export type TicketLookup =
  | { status: 'not_found'; slug?: string }
  | { status: 'ready' | 'already'; attendee: TicketAttendee };

export type TicketAttendee = {
  id: string;
  name: string;
  role: string;
  company: string;
  splineUrl: string | null;
  slug: string;
  firstName: string;
  lastName: string | null;
  position: string | null;
  phone: string | null;
  phoneCountryCode: string | null;
  email: string | null;
  website: string | null;
  planCode: string | null;
  joinedAt: string;
  checkedInAt: string | null;
};

/** Joining an event's community from the public event page. */
export type EventMembershipResult = {
  organizationSlug: string;
  eventId: string;
  cardSlug: string | null;
  alreadyMember: boolean;
  cardComplete: boolean;
};

// ── Event detail (organizer view) ──────────────────────────────────────────

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

// ── Event list ──────────────────────────────────────────────────────────────

export type CommunityEventStatus = 'upcoming' | 'past';

export type CommunityEvent = {
  id: string;
  title: string;
  dateLabel: string;
  location: string;
  imageUrl: string;
  status: CommunityEventStatus;
  description: string;
  startsAt: string;
  endsAt: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number | null;
  coverUrl: string;
  photoUrls: string[];
  registrationMode: EventDTO['registrationMode'];
  approvalMode: EventDTO['approvalMode'];
  registeredCount: number;
  viewerRegistrationStatus: ViewerRegistrationStatus;
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
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  coverUrl: string;
  photoUrls: string[];
  capacity: number | null;
  registrationMode: EventDTO['registrationMode'];
  approvalMode: EventDTO['approvalMode'];
};

export function toCommunityEvent(event: EventListItemDTO): CommunityEvent {
  return {
    id: event.id,
    title: event.title,
    dateLabel: formatEventDateLabel(event.startsAt),
    location: event.location,
    imageUrl: event.coverUrl,
    status: eventStatus(event.endsAt),
    description: event.description ?? '',
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    date: formatEventDateValue(event.startsAt),
    startTime: formatEventTimeValue(event.startsAt),
    endTime: formatEventTimeValue(event.endsAt),
    capacity: event.capacity,
    coverUrl: event.coverUrl,
    photoUrls: event.photoUrls ?? [],
    registrationMode: event.registrationMode,
    approvalMode: event.approvalMode,
    registeredCount: event.registeredCount,
    viewerRegistrationStatus: event.viewerRegistrationStatus,
  };
}
