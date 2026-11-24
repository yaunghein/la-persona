import { sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';
import { user } from './auth';
import { card } from './card';
import { cardAssignment } from './card-assignment';
import { event } from './event';

export const contactExchange = pgTable(
  'contact_exchange',
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => nanoid()),
    name: text().notNull(),
    phone: text().notNull(),
    phoneCountryCode: text(),
    email: text(),
    company: text(),
    position: text(),
    cardId: text().references(() => card.id, { onDelete: 'cascade' }),
    cardAssignmentId: text().references(() => cardAssignment.id, {
      onDelete: 'set null',
    }),
    source: text().default('public_form').notNull(),
    laPersonaUserId: text().references(() => user.id, { onDelete: 'set null' }),
    laPersonaCardId: text().references(() => card.id, { onDelete: 'set null' }),
    reciprocalExchangeId: text(),
    // Set when either side is checked in during the event's calendar days; the card holder can change it.
    eventId: text().references(() => event.id, { onDelete: 'set null' }),
    note: text(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('contact_exchange_card_idx').on(table.cardId),
    index('contact_exchange_assignment_idx').on(table.cardAssignmentId),
    index('contact_exchange_la_persona_user_idx').on(table.laPersonaUserId),
    index('contact_exchange_event_idx').on(table.eventId),
    // One seamless contact per person per card, and per holder tenure on
    // company cards, so a new holder starts their own row.
    uniqueIndex('contact_exchange_card_la_persona_user_uidx')
      .on(table.cardId, table.laPersonaUserId)
      .where(sql`${table.cardAssignmentId} IS NULL`),
    uniqueIndex('contact_exchange_assignment_la_persona_user_uidx')
      .on(table.cardId, table.laPersonaUserId, table.cardAssignmentId)
      .where(sql`${table.cardAssignmentId} IS NOT NULL`),
  ]
);
