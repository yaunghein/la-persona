import { pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';
import { member, organization } from './auth';

export const communitySetting = pgTable(
  'community_setting',
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => nanoid()),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    coverUrl: text(),
    inviteToken: text()
      .notNull()
      .$defaultFn(() => nanoid()),
    /** Join links expire; managers rotate the token to issue a fresh link. */
    splineUrl: text().default('').notNull(),
    wallpaperUrl: text().default('').notNull(),
    cardBackUrl: text().default('').notNull(),
    // Community-branded email artwork, uploaded from Thakhin only.
    emailQrBackgroundUrl: text().default('').notNull(),
    emailContactExchangeUrl: text().default('').notNull(),
    emailAfterEventUrl: text().default('').notNull(),
    description: text().default('').notNull(),
    guidelines: text().default('').notNull(),
    whyJoin: text().default('').notNull(),
    /** The organizer whose card "Contact Organizer" opens; null hides the button. */
    organizerMemberId: text().references(() => member.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('community_setting_organization_uidx').on(table.organizationId),
    uniqueIndex('community_setting_invite_token_uidx').on(table.inviteToken),
  ]
);
