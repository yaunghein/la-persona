import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { z } from 'zod';
import { event } from '~~/server/db/schema';
import {
  EVENT_MAX_EXTRA_PHOTOS,
  isAllowedEventImageUrl,
} from '~~/shared/utils/event-media';
import { eventScheduleError } from '~~/shared/utils/event-datetime';

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
  .refine(
    (url) =>
      isAllowedEventImageUrl(url, {
        bucket: process.env.AWS_BUCKET_NAME ?? '',
        region: process.env.AWS_REGION ?? '',
      }),
    { message: 'Invalid image URL' }
  );

const eventBodyFields = {
  title: z.string().trim().min(1, 'Event name is required'),
  description: z.string().trim().optional().or(z.literal('')),
  location: z.string().trim().min(1, 'Location is required'),
  startsAt: z.iso.datetime({ offset: true, message: 'Start time is required' }),
  endsAt: z.iso.datetime({ offset: true, message: 'End time is required' }),
  capacity: z.number().int().positive().nullable(),
  coverUrl: eventImageUrlSchema,
  photoUrls: z.array(eventImageUrlSchema).max(EVENT_MAX_EXTRA_PHOTOS),
  registrationMode: z.enum(EVENT_REGISTRATION_MODES).default('open'),
  approvalMode: z.enum(EVENT_APPROVAL_MODES).default('everyone'),
};

function eventBodySchema(allowPast: boolean) {
  return z.object(eventBodyFields).superRefine((value, ctx) => {
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

export const createEventBodySchema = eventBodySchema(false);

export type CreateEventBody = z.output<typeof createEventBodySchema>;

export const updateEventBodySchema = eventBodySchema(true);

export type UpdateEventBody = CreateEventBody;
