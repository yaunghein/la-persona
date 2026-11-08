import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';
import { organization } from './auth';
import { eventRegistration } from './event-registration';

/** A community's labels for event attendees, managed by organizers. */
export const attendeeLabel = pgTable(
  'attendee_label',
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => nanoid()),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    color: varchar({ length: 7 }).notNull(),
    // Copied onto the attendee's next registration in this community, once, when they register.
    carriesOver: boolean().default(false).notNull(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('attendee_label_organization_name_uidx').on(
      table.organizationId,
      sql`lower(${table.name})`
    ),
  ]
);

/** Labels attach to a registration, so they apply to one event only. */
export const registrationLabel = pgTable(
  'registration_label',
  {
    registrationId: text()
      .notNull()
      .references(() => eventRegistration.id, { onDelete: 'cascade' }),
    labelId: text()
      .notNull()
      .references(() => attendeeLabel.id, { onDelete: 'cascade' }),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.registrationId, table.labelId] }),
    index('registration_label_label_idx').on(table.labelId),
  ]
);
