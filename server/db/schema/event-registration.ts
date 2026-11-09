import { sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';
import { event } from './event';
import { user } from './auth';

export const EVENT_REGISTRATION_STATUSES = [
  'pending',
  'registered',
  'checked_in',
] as const;

export type EventRegistrationStatus =
  (typeof EVENT_REGISTRATION_STATUSES)[number];

export const eventRegistration = pgTable(
  'event_registration',
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => nanoid()),
    eventId: text()
      .notNull()
      .references(() => event.id, { onDelete: 'cascade' }),
    // Null for a walk-in with no email, entered by staff at the door.
    userId: text().references(() => user.id, { onDelete: 'cascade' }),
    guestName: text(),
    guestPhone: text(),
    guestPhoneCountryCode: text(),
    guestCompany: text(),
    guestPosition: text(),
    guestNote: text(),
    createdByUserId: text().references(() => user.id, {
      onDelete: 'set null',
    }),
    status: text()
      .$type<EventRegistrationStatus>()
      .default('registered')
      .notNull(),
    registeredAt: timestamp().defaultNow().notNull(),
    checkedInAt: timestamp(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('event_registration_event_user_uidx').on(
      table.eventId,
      table.userId
    ),
    index('event_registration_event_idx').on(table.eventId),
    index('event_registration_user_idx').on(table.userId),
    check(
      'event_registration_user_or_guest_chk',
      sql`${table.userId} is not null or ${table.guestName} is not null`
    ),
  ]
);
