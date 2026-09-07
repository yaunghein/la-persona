import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { z } from 'zod';
import { event } from '~~/server/db/schema';
import { EVENT_MAX_EXTRA_PHOTOS } from '~~/shared/utils/event-media';
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

export const createEventBodySchema = z.object({
  title: z.string().trim().min(1, 'Event name is required'),
  description: z.string().trim().optional().or(z.literal('')),
  location: z.string().trim().min(1, 'Location is required'),
  date: z
    .string()
    .refine(isEventDateValue, { message: 'Date is required' }),
  startTime: z
    .string()
    .refine(isEventTimeValue, { message: 'Start time is required' }),
  endTime: z
    .string()
    .refine(isEventTimeValue, { message: 'End time is required' }),
  capacity: z.number().int().positive().nullable(),
  hasCover: z
    .boolean()
    .refine((value) => value === true, {
      message: 'Cover photo is required',
    }),
  extraPhotoCount: z.number().int().min(0).max(EVENT_MAX_EXTRA_PHOTOS),
});

export type CreateEventBody = z.output<typeof createEventBodySchema>;

export const updateEventBodySchema = createEventBodySchema
  .omit({ hasCover: true, extraPhotoCount: true })
  .extend({
    coverChanged: z.boolean(),
    keptPhotoUrls: z
      .array(z.string().trim().min(1))
      .max(EVENT_MAX_EXTRA_PHOTOS),
    newPhotoCount: z.number().int().min(0).max(EVENT_MAX_EXTRA_PHOTOS),
  })
  .refine(
    (value) =>
      value.keptPhotoUrls.length + value.newPhotoCount <= EVENT_MAX_EXTRA_PHOTOS,
    { message: 'You can add up to 4 extra photos' }
  );

export type UpdateEventBody = z.output<typeof updateEventBodySchema>;
