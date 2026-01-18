import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';

export const contactExchangeBeforePlatform = pgTable(
  'contact_exchange_before_platform',
  {
    id: text()
      .primaryKey()
      .notNull()
      .$default(() => nanoid()),
    name: text().notNull(),
    phone: text().notNull(),
    email: text(),
    position: text(),
    ownerEmail: text().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  }
);
