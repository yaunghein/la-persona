import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { z } from 'zod';
import { event } from '~~/server/db/schema';
import {
  EVENT_MAX_EXTRA_PHOTOS,
  isAllowedEventImageUrl,
} from '~~/shared/utils/event-media';
import {
  isEventDateValue,
  isEventTimeValue,
} from '~~/shared/utils/event-datetime';

export type SelectEvent = InferSelectModel<typeof event>;
export type InsertEvent = InferInsertModel<typeof event>;

export type EventDTO = Omit<
  SelectEvent,
  'startsAt' | 'endsAt' | 'createdAt' | 'updatedAt'
> & {
  startsAt: string;
  endsAt: string;
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
  viewer: PublicEventViewer | null;
};

export type EventListItemDTO = EventDTO & {
  registeredCount: number;
  viewerRegistrationStatus: ViewerRegistrationStatus;
};

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
  .refine(
    (url) =>
      isAllowedEventImageUrl(url, {
        bucket: process.env.AWS_BUCKET_NAME ?? '',
        region: process.env.AWS_REGION ?? '',
      }),
    { message: 'Invalid image URL' }
  );

export const createEventBodySchema = z.object({
  title: z.string().trim().min(1, 'Event name is required'),
  description: z.string().trim().optional().or(z.literal('')),
  location: z.string().trim().min(1, 'Location is required'),
  date: z.string().refine(isEventDateValue, { message: 'Date is required' }),
  startTime: z
    .string()
    .refine(isEventTimeValue, { message: 'Start time is required' }),
  endTime: z
    .string()
    .refine(isEventTimeValue, { message: 'End time is required' }),
  capacity: z.number().int().positive().nullable(),
  coverUrl: eventImageUrlSchema,
  photoUrls: z.array(eventImageUrlSchema).max(EVENT_MAX_EXTRA_PHOTOS),
  registrationMode: z.enum(EVENT_REGISTRATION_MODES).default('open'),
  approvalMode: z.enum(EVENT_APPROVAL_MODES).default('everyone'),
});

export type CreateEventBody = z.output<typeof createEventBodySchema>;

export const updateEventBodySchema = createEventBodySchema;

export type UpdateEventBody = CreateEventBody;
